/**
 * lib/evaluation-service.ts
 *
 * Orchestrates full interview evaluation:
 *   1. Fetches all responses for each round of an interview.
 *   2. Calls the AI evaluator for written answers (DSA, Core CS: DBMS/OS/Networks/OOP).
 *   3. Aggregates coding scores from saved code_submissions.
 *   4. Upserts skill-level evaluations (idempotent).
 *   5. Creates or updates one report per interview.
 *
 * This module is server-only: expected answers never reach the browser.
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  evaluateWrittenAnswer,
  type QuestionForEval,
  type EvaluationCriteria,
} from "@/lib/evaluator";

// ─── Types ────────────────────────────────────────────────────────────────────

type SkillEvaluation = {
  skill: string;
  score: number;
  maxScore: number;
  evidence: EvidenceItem[];
  feedback: string;
  pending: boolean;
};

type EvidenceItem = {
  questionId: string;
  question: string;
  score: number;
  maxScore: number;
  feedback: string;
  matched_key_points: string[];
  missing_key_points: string[];
  quotes: string[];
};

// ─── Skill mapping for Core CS sub-skills ─────────────────────────────────────

// Categories that map to named skills (Core CS sub-skills are preserved separately)
const CATEGORY_TO_SKILL: Record<string, string> = {
  DSA: "DSA",
  DBMS: "DBMS",
  OS: "OS",
  Networks: "Networks",
  OOP: "OOP",
  Coding: "Coding",
  // "Core CS" rows with sub-category handled below
};

function categoryToSkill(category: string): string {
  return CATEGORY_TO_SKILL[category] ?? category;
}

// ─── Main evaluation function ─────────────────────────────────────────────────

export async function runInterviewEvaluation(interviewId: string): Promise<{
  success: boolean;
  error?: string;
  skills?: SkillEvaluation[];
}> {
  if (!interviewId) {
    return { success: false, error: "Interview ID is required." };
  }

  const admin = createAdminClient();

  // 1. Verify the interview exists
  const { data: interview, error: interviewErr } = await admin
    .from("interviews")
    .select("id, status")
    .eq("id", interviewId)
    .maybeSingle();

  if (interviewErr || !interview) {
    return {
      success: false,
      error: interviewErr?.message ?? "Interview not found.",
    };
  }

  // 2. Fetch all rounds for this interview
  const { data: rounds, error: roundsErr } = await admin
    .from("interview_rounds")
    .select("id, round_type")
    .eq("interview_id", interviewId);

  if (roundsErr) {
    return { success: false, error: roundsErr.message };
  }

  const roundIds = (rounds ?? []).map((r) => r.id);

  // 3. Fetch all written responses
  const { data: responses, error: responsesErr } = await admin
    .from("responses")
    .select("id, question_id, answer, round_id")
    .in("round_id", roundIds.length > 0 ? roundIds : ["__none__"]);

  if (responsesErr) {
    return { success: false, error: responsesErr.message };
  }

  // 4. Collect unique question IDs from written responses
  const questionIds = [
    ...new Set((responses ?? []).map((r) => r.question_id as string)),
  ];

  let questions: QuestionForEval[] = [];

  if (questionIds.length > 0) {
    const { data: qRows, error: qErr } = await admin
      .from("questions")
      .select(
        "id, category, topic, difficulty, question, expected_answer, evaluation_criteria, marks"
      )
      .in("id", questionIds);

    if (qErr) {
      return { success: false, error: qErr.message };
    }

    questions = (qRows ?? []).map((q) => ({
      id: q.id as string,
      category: q.category as string,
      topic: q.topic as string,
      difficulty: (q.difficulty ?? "Medium") as "Easy" | "Medium" | "Hard",
      question: q.question as string,
      expected_answer: (q.expected_answer as string | null) ?? null,
      evaluation_criteria:
        (q.evaluation_criteria as EvaluationCriteria | null) ?? null,
      marks: (q.marks as number) ?? 10,
    }));
  }

  const questionMap = new Map(questions.map((q) => [q.id, q]));

  // 5. Evaluate written answers (non-Coding) grouped by skill
  const skillBuckets = new Map<
    string,
    { evals: EvidenceItem[]; pending: boolean }
  >();

  for (const response of responses ?? []) {
    const qId = response.question_id as string;
    const q = questionMap.get(qId);
    if (!q) continue;

    // Skip Coding category – handled separately via code_submissions
    if (q.category === "Coding") continue;

    const skill = categoryToSkill(q.category);
    const bucket = skillBuckets.get(skill) ?? { evals: [], pending: false };

    const evaluation = await evaluateWrittenAnswer(q, response.answer ?? "");

    bucket.evals.push({
      questionId: qId,
      question: q.question,
      score: evaluation.score,
      maxScore: evaluation.maxScore,
      feedback: evaluation.feedback,
      matched_key_points: evaluation.matched_key_points,
      missing_key_points: evaluation.missing_key_points,
      quotes: evaluation.evidence,
    });

    if (evaluation.pending) {
      bucket.pending = true;
    }

    skillBuckets.set(skill, bucket);
  }

  // 6. Aggregate coding from code_submissions (best per question across all submissions)
  const codingRoundIds = (rounds ?? [])
    .filter((r) => r.round_type === "Coding")
    .map((r) => r.id as string);

  if (codingRoundIds.length > 0) {
    const { data: submissions, error: subErr } = await admin
      .from("code_submissions")
      .select(
        "question_id, passed_test_cases, total_test_cases, created_at"
      )
      .in("round_id", codingRoundIds)
      .order("created_at", { ascending: false });

    if (!subErr && submissions) {
      // Best submission per question (highest pass rate)
      const bestByQuestion = new Map<
        string,
        { passed: number; total: number }
      >();

      for (const sub of submissions) {
        const qId = sub.question_id as string;
        const passed = (sub.passed_test_cases as number) ?? 0;
        const total = (sub.total_test_cases as number) ?? 0;
        const existing = bestByQuestion.get(qId);
        if (!existing || passed / Math.max(total, 1) > existing.passed / Math.max(existing.total, 1)) {
          bestByQuestion.set(qId, { passed, total });
        }
      }

      // Fetch coding questions for marks
      const codingQIds = [...bestByQuestion.keys()];
      let codingQuestions: { id: string; question: string; marks: number }[] = [];

      if (codingQIds.length > 0) {
        const { data: cqRows } = await admin
          .from("questions")
          .select("id, question, marks")
          .in("id", codingQIds);
        codingQuestions = (cqRows ?? []) as { id: string; question: string; marks: number }[];
      }

      const codingQMap = new Map(codingQuestions.map((q) => [q.id, q]));
      const codingEvals: EvidenceItem[] = [];

      for (const [qId, { passed, total }] of bestByQuestion) {
        const cq = codingQMap.get(qId);
        const marks = cq?.marks ?? 20;
        const score = total > 0 ? Math.round((passed / total) * marks) : 0;
        const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

        codingEvals.push({
          questionId: qId,
          question: cq?.question ?? "Coding question",
          score,
          maxScore: marks,
          feedback: `Passed ${passed}/${total} test cases (${pct}%).`,
          matched_key_points: passed > 0 ? [`${passed} test case(s) passed`] : [],
          missing_key_points: passed < total ? [`${total - passed} test case(s) failed`] : [],
          quotes: [],
        });
      }

      if (codingEvals.length > 0) {
        skillBuckets.set("Coding", {
          evals: codingEvals,
          pending: false,
        });
      }
    }
  }

  // 7. Build final skill evaluations
  const skillEvaluations: SkillEvaluation[] = [];

  for (const [skill, bucket] of skillBuckets) {
    const totalScore = bucket.evals.reduce((s, e) => s + e.score, 0);
    const totalMax = bucket.evals.reduce((s, e) => s + e.maxScore, 0);
    const feedbackParts = bucket.evals
      .filter((e) => e.feedback)
      .map((e) => `[${e.question.slice(0, 60)}]: ${e.feedback}`)
      .slice(0, 5);

    skillEvaluations.push({
      skill,
      score: totalScore,
      maxScore: totalMax,
      evidence: bucket.evals,
      feedback: feedbackParts.join(" | ") || "No feedback available.",
      pending: bucket.pending,
    });
  }

  // 8. Upsert skill evaluations (idempotent: delete existing, re-insert)
  if (skillEvaluations.length > 0) {
    const skillNames = skillEvaluations.map((s) => s.skill);

    // Delete stale skill rows for this interview (only the skills we're re-evaluating)
    await admin
      .from("evaluations")
      .delete()
      .eq("interview_id", interviewId)
      .in("skill", skillNames);

    const rows = skillEvaluations.map((se) => ({
      interview_id: interviewId,
      skill: se.skill,
      score: se.score,
      max_score: se.maxScore,
      evidence: se.evidence,
      feedback: se.feedback,
    }));

    const { error: evalInsertErr } = await admin
      .from("evaluations")
      .insert(rows);

    if (evalInsertErr) {
      return { success: false, error: evalInsertErr.message };
    }
  }

  // 9. Build report
  const totalScore = skillEvaluations.reduce((s, e) => s + e.score, 0);
  const totalMax = skillEvaluations.reduce((s, e) => s + e.maxScore, 0);
  const percentage = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;

  const strengths = skillEvaluations
    .filter((e) => e.maxScore > 0 && e.score / e.maxScore >= 0.7)
    .map((e) => `${e.skill}: ${e.score}/${e.maxScore}`);

  const weaknesses = skillEvaluations
    .filter((e) => e.maxScore > 0 && e.score / e.maxScore < 0.5)
    .map((e) => `${e.skill}: ${e.score}/${e.maxScore}`);

  const recommendation: "Hire" | "Hold" | "Reject" =
    percentage >= 70 ? "Hire" : percentage >= 50 ? "Hold" : "Reject";

  // Upsert report (unique per interview_id)
  const { error: reportErr } = await admin.from("reports").upsert(
    {
      interview_id: interviewId,
      overall_score: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
      recommendation,
      strengths,
      weaknesses,
      human_review_status: "Pending",
    },
    { onConflict: "interview_id" }
  );

  if (reportErr) {
    return { success: false, error: reportErr.message };
  }

  return { success: true, skills: skillEvaluations };
}
