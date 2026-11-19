
/**
 * lib/evaluation-service.ts
 *
 * Evaluates written answers in one Gemini batch,
 * aggregates coding test results, and generates
 * skill scorecards and interview reports.
 */

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  type QuestionForEval,
  type EvaluationCriteria,
} from "@/lib/evaluator";
import { evaluateWrittenAnswersBatch } from "@/lib/batch-evaluator";

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

type SkillEvaluation = {
  skill: string;
  score: number;
  maxScore: number;
  evidence: EvidenceItem[];
  feedback: string;
  pending: boolean;
};

const CATEGORY_TO_SKILL: Record<string, string> = {
  DSA: "DSA",
  DBMS: "DBMS",
  OS: "OS",
  Networks: "Networks",
  OOP: "OOP",
  Coding: "Coding",
};

function categoryToSkill(category: string): string {
  return CATEGORY_TO_SKILL[category] ?? category;
}

export async function runInterviewEvaluation(
  interviewId: string
): Promise<{
  success: boolean;
  error?: string;
  skills?: SkillEvaluation[];
}> {
  if (!interviewId) {
    return {
      success: false,
      error: "Interview ID is required.",
    };
  }

  const admin = createAdminClient();

  // 1. Verify interview exists.
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

  // 2. Verify all three interview rounds are completed.
  const { data: rounds, error: roundsErr } = await admin
    .from("interview_rounds")
    .select("id, round_type, status")
    .eq("interview_id", interviewId);

  if (roundsErr) {
    return {
      success: false,
      error: roundsErr.message,
    };
  }

  const requiredRounds = ["DSA", "Core CS", "Coding"];

  const allRoundsCompleted = requiredRounds.every((type) =>
    (rounds ?? []).some(
      (round) =>
        round.round_type === type &&
        round.status === "Completed"
    )
  );

  if (!allRoundsCompleted) {
    return {
      success: false,
      error:
        "Complete DSA, Core CS, and Coding before generating a report.",
    };
  }

  const roundIds = (rounds ?? [])
    .filter((round) =>
      requiredRounds.includes(round.round_type)
    )
    .map((round) => round.id);

  // 3. Fetch candidate responses.
  const { data: responses, error: responsesErr } = await admin
    .from("responses")
    .select("id, question_id, answer, round_id")
    .in(
      "round_id",
      roundIds.length > 0 ? roundIds : ["__none__"]
    );

  if (responsesErr) {
    return {
      success: false,
      error: responsesErr.message,
    };
  }

  // 4. Fetch questions and grading criteria.
  const questionIds = [
    ...new Set(
      (responses ?? []).map(
        (response) => response.question_id as string
      )
    ),
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
      return {
        success: false,
        error: qErr.message,
      };
    }

    questions = (qRows ?? []).map((q) => ({
      id: q.id as string,
      category: q.category as string,
      topic: q.topic as string,
      difficulty: (q.difficulty ?? "Medium") as
        | "Easy"
        | "Medium"
        | "Hard",
      question: q.question as string,
      expected_answer:
        (q.expected_answer as string | null) ?? null,
      evaluation_criteria:
        (q.evaluation_criteria as EvaluationCriteria | null) ??
        null,
      marks: (q.marks as number) ?? 10,
    }));
  }

  const questionMap = new Map(
    questions.map((question) => [question.id, question])
  );

  // 5. Evaluate written answers in ONE Gemini request.
  const skillBuckets = new Map<
    string,
    { evals: EvidenceItem[]; pending: boolean }
  >();

  const writtenItems = (responses ?? [])
    .map((response) => {
      const question = questionMap.get(
        response.question_id as string
      );

      if (!question || question.category === "Coding") {
        return null;
      }

      return {
        question,
        answer: (response.answer ?? "") as string,
      };
    })
    .filter(
      (
        item
      ): item is {
        question: QuestionForEval;
        answer: string;
      } => item !== null
    );

  const batchResults = await evaluateWrittenAnswersBatch(
    writtenItems
  );

  for (let i = 0; i < writtenItems.length; i++) {
    const { question } = writtenItems[i];
    const evaluation = batchResults[i];

    const skill = categoryToSkill(question.category);

    const bucket = skillBuckets.get(skill) ?? {
      evals: [],
      pending: false,
    };

    bucket.evals.push({
      questionId: question.id,
      question: question.question,
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

  // 6. Aggregate coding submissions.
  const codingRoundIds = (rounds ?? [])
    .filter((round) => round.round_type === "Coding")
    .map((round) => round.id as string);

  if (codingRoundIds.length > 0) {
    const { data: submissions, error: subErr } = await admin
      .from("code_submissions")
      .select(
        "question_id, passed_test_cases, total_test_cases, created_at"
      )
      .in("round_id", codingRoundIds)
      .order("created_at", { ascending: false });

    if (subErr) {
      return {
        success: false,
        error: subErr.message,
      };
    }

    const bestByQuestion = new Map<
      string,
      { passed: number; total: number }
    >();

    for (const sub of submissions ?? []) {
      const qId = sub.question_id as string;
      const passed =
        (sub.passed_test_cases as number) ?? 0;
      const total =
        (sub.total_test_cases as number) ?? 0;

      const existing = bestByQuestion.get(qId);

      if (
        !existing ||
        passed / Math.max(total, 1) >
        existing.passed / Math.max(existing.total, 1)
      ) {
        bestByQuestion.set(qId, {
          passed,
          total,
        });
      }
    }

    const codingQIds = [...bestByQuestion.keys()];

    let codingQuestions: {
      id: string;
      question: string;
      marks: number;
    }[] = [];

    if (codingQIds.length > 0) {
      const { data: cqRows, error: cqErr } = await admin
        .from("questions")
        .select("id, question, marks")
        .in("id", codingQIds);

      if (cqErr) {
        return {
          success: false,
          error: cqErr.message,
        };
      }

      codingQuestions = (cqRows ?? []) as {
        id: string;
        question: string;
        marks: number;
      }[];
    }

    const codingQMap = new Map(
      codingQuestions.map((q) => [q.id, q])
    );

    const codingEvals: EvidenceItem[] = [];

    for (const [qId, { passed, total }] of bestByQuestion) {
      const cq = codingQMap.get(qId);
      const marks = cq?.marks ?? 20;

      const score =
        total > 0
          ? Math.round((passed / total) * marks)
          : 0;

      const pct =
        total > 0
          ? Math.round((passed / total) * 100)
          : 0;

      codingEvals.push({
        questionId: qId,
        question: cq?.question ?? "Coding question",
        score,
        maxScore: marks,
        feedback: `Passed ${passed}/${total} test cases (${pct}%).`,
        matched_key_points:
          passed > 0
            ? [`${passed} test case(s) passed`]
            : [],
        missing_key_points:
          passed < total
            ? [`${total - passed} test case(s) failed`]
            : [],
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

  // 7. Build skill scorecards.
  const skillEvaluations: SkillEvaluation[] = [];

  for (const [skill, bucket] of skillBuckets) {
    const totalScore = bucket.evals.reduce(
      (sum, item) => sum + item.score,
      0
    );

    const totalMax = bucket.evals.reduce(
      (sum, item) => sum + item.maxScore,
      0
    );

    const feedbackParts = bucket.evals
      .filter((item) => item.feedback)
      .map(
        (item) =>
          `[${item.question.slice(0, 60)}]: ${item.feedback}`
      )
      .slice(0, 5);

    skillEvaluations.push({
      skill,
      score: totalScore,
      maxScore: totalMax,
      evidence: bucket.evals,
      feedback:
        feedbackParts.join(" | ") ||
        "No feedback available.",
      pending: bucket.pending,
    });
  }

  // Never generate a recommendation while AI grading is pending.
  const pendingSkills = skillEvaluations.filter(
    (skill) => skill.pending
  );

  if (pendingSkills.length > 0) {
    return {
      success: false,
      error:
        "AI evaluation is pending for: " +
        pendingSkills.map((skill) => skill.skill).join(", ") +
        ". Check Gemini API configuration, quota, and server logs.",
      skills: skillEvaluations,
    };
  }

  // Prevent reports without scored data.
  if (
    skillEvaluations.length === 0 ||
    skillEvaluations.some((skill) => skill.maxScore <= 0)
  ) {
    return {
      success: false,
      error: "No complete, scored evaluation data is available.",
    };
  }

  // 8. Save skill evaluations.
  const skillNames = skillEvaluations.map(
    (skill) => skill.skill
  );

  const { error: deleteErr } = await admin
    .from("evaluations")
    .delete()
    .eq("interview_id", interviewId)
    .in("skill", skillNames);

  if (deleteErr) {
    return {
      success: false,
      error: deleteErr.message,
    };
  }

  const evaluationRows = skillEvaluations.map((skill) => ({
    interview_id: interviewId,
    skill: skill.skill,
    score: skill.score,
    max_score: skill.maxScore,
    evidence: skill.evidence,
    feedback: skill.feedback,
  }));

  const { error: evalInsertErr } = await admin
    .from("evaluations")
    .insert(evaluationRows);

  if (evalInsertErr) {
    return {
      success: false,
      error: evalInsertErr.message,
    };
  }

  // 9. Calculate final report.
  const totalScore = skillEvaluations.reduce(
    (sum, skill) => sum + skill.score,
    0
  );

  const totalMax = skillEvaluations.reduce(
    (sum, skill) => sum + skill.maxScore,
    0
  );

  const percentage =
    totalMax > 0
      ? (totalScore / totalMax) * 100
      : 0;

  const strengths = skillEvaluations
    .filter(
      (skill) =>
        skill.maxScore > 0 &&
        skill.score / skill.maxScore >= 0.7
    )
    .map(
      (skill) =>
        `${skill.skill}: ${skill.score}/${skill.maxScore}`
    );

  const weaknesses = skillEvaluations
    .filter(
      (skill) =>
        skill.maxScore > 0 &&
        skill.score / skill.maxScore < 0.5
    )
    .map(
      (skill) =>
        `${skill.skill}: ${skill.score}/${skill.maxScore}`
    );

  const recommendation: "Hire" | "Hold" | "Reject" =
    percentage >= 70
      ? "Hire"
      : percentage >= 50
        ? "Hold"
        : "Reject";

  // Preserve existing human-review decision.
  const {
    data: existingReport,
    error: existingReportErr,
  } = await admin
    .from("reports")
    .select("human_review_status")
    .eq("interview_id", interviewId)
    .maybeSingle();

  if (existingReportErr) {
    return {
      success: false,
      error: existingReportErr.message,
    };
  }

  const { error: reportErr } = await admin
    .from("reports")
    .upsert(
      {
        interview_id: interviewId,
        overall_score: Math.round(percentage),
        recommendation,
        strengths,
        weaknesses,
        human_review_status:
          existingReport?.human_review_status ?? "Pending",
      },
      {
        onConflict: "interview_id",
      }
    );

  if (reportErr) {
    return {
      success: false,
      error: reportErr.message,
    };
  }

  return {
    success: true,
    skills: skillEvaluations,
  };
}
