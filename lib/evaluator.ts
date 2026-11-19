/**
 * lib/evaluator.ts
 *
 * Server-only evaluation service for Phase 10.
 * Uses Claude AI when ANTHROPIC_API_KEY is set; returns "Evaluation pending"
 * otherwise.  Expected answers and grading prompts never leave this module.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EvaluationCriteria = {
  key_points?: string[];
  follow_up?: string;
};

export type QuestionForEval = {
  id: string;
  category: string;
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard";
  question: string;
  expected_answer: string | null;
  evaluation_criteria: EvaluationCriteria | null;
  marks: number;
};

export type AnswerEvaluation = {
  questionId: string;
  score: number;
  maxScore: number;
  feedback: string;
  matched_key_points: string[];
  missing_key_points: string[];
  evidence: string[];  // short verbatim quotes from candidate answer
  pending: boolean;    // true when no AI key is configured
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isBlankOrCommandAnswer(answer: string): boolean {
  const trimmed = answer.trim().toLowerCase();
  if (!trimmed) return true;
  // Common non-answers: shell commands, single words that have no technical value
  const commandPatterns = [
    /^npm\s+/,
    /^npx\s+/,
    /^yarn\s+/,
    /^pnpm\s+/,
    /^node\s+/,
    /^python\s+/,
    /^git\s+/,
    /^ls\b/,
    /^pwd\b/,
    /^cd\s+/,
  ];
  if (commandPatterns.some((re) => re.test(trimmed))) return true;
  return false;
}

function clampScore(score: unknown, max: number): number {
  const n = typeof score === "number" ? score : Number(score);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(max, Math.round(n)));
}

// ─── Claude evaluation ────────────────────────────────────────────────────────

function buildPrompt(
  question: QuestionForEval,
  candidateAnswer: string
): string {
  const keyPoints = question.evaluation_criteria?.key_points ?? [];

  return `You are a technical interview evaluator. Assess the candidate's answer strictly and objectively.

QUESTION (${question.difficulty}, ${question.category} – ${question.topic}):
${question.question}

EXPECTED ANSWER (reference only – do not reveal to candidate):
${question.expected_answer ?? "(not provided)"}

KEY POINTS TO LOOK FOR:
${keyPoints.length > 0 ? keyPoints.map((kp, i) => `${i + 1}. ${kp}`).join("\n") : "(none specified)"}

MAXIMUM MARKS: ${question.marks}

CANDIDATE'S ANSWER:
${candidateAnswer}

EVALUATION INSTRUCTIONS:
1. Score from 0 to ${question.marks}. Use the full range.
2. Award 0 for empty, irrelevant, or non-technical answers.
3. Identify which key points the candidate correctly addressed.
4. Identify which key points are missing or incorrect.
5. For evidence, quote short verbatim phrases (≤ 15 words each) ONLY from the candidate's answer. Never invent quotes.
6. Write concise, constructive feedback (2–4 sentences).

Respond with ONLY valid JSON in this exact shape:
{
  "score": <integer 0–${question.marks}>,
  "feedback": "<string>",
  "matched_key_points": ["<string>", ...],
  "missing_key_points": ["<string>", ...],
  "evidence": ["<verbatim quote from candidate answer>", ...]
}`;
}

let _client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export async function evaluateWrittenAnswer(
  question: QuestionForEval,
  candidateAnswer: string
): Promise<AnswerEvaluation> {
  const base: Omit<AnswerEvaluation, "score" | "feedback" | "matched_key_points" | "missing_key_points" | "evidence" | "pending"> = {
    questionId: question.id,
    maxScore: question.marks,
  };

  // Zero-score for blank / shell-command answers
  if (isBlankOrCommandAnswer(candidateAnswer)) {
    return {
      ...base,
      score: 0,
      feedback: "No substantive answer was provided.",
      matched_key_points: [],
      missing_key_points: question.evaluation_criteria?.key_points ?? [],
      evidence: [],
      pending: false,
    };
  }

  const client = getClient();

  if (!client) {
    // No API key – return pending state
    return {
      ...base,
      score: 0,
      feedback: "Evaluation pending: AI grading is not yet configured.",
      matched_key_points: [],
      missing_key_points: [],
      evidence: [],
      pending: true,
    };
  }

  try {
    const message = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: buildPrompt(question, candidateAnswer),
        },
      ],
    });

    const rawText =
      message.content[0]?.type === "text" ? message.content[0].text : "";

    // Extract JSON block (handle markdown code fences)
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) ??
      rawText.match(/(\{[\s\S]*\})/);
    const jsonText = jsonMatch ? jsonMatch[1] : rawText;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      console.error("Evaluator: could not parse AI response", rawText);
      return {
        ...base,
        score: 0,
        feedback: "Evaluation could not be parsed. Manual review required.",
        matched_key_points: [],
        missing_key_points: [],
        evidence: [],
        pending: true,
      };
    }

    const score = clampScore(parsed.score, question.marks);
    const feedback =
      typeof parsed.feedback === "string" && parsed.feedback.trim()
        ? parsed.feedback.trim()
        : "No feedback provided.";

    const matched_key_points = Array.isArray(parsed.matched_key_points)
      ? (parsed.matched_key_points as unknown[])
          .filter((x): x is string => typeof x === "string")
          .slice(0, 20)
      : [];

    const missing_key_points = Array.isArray(parsed.missing_key_points)
      ? (parsed.missing_key_points as unknown[])
          .filter((x): x is string => typeof x === "string")
          .slice(0, 20)
      : [];

    // Validate evidence: must be substrings of the actual answer
    const evidence = Array.isArray(parsed.evidence)
      ? (parsed.evidence as unknown[])
          .filter((x): x is string => typeof x === "string")
          .filter((quote) =>
            candidateAnswer.toLowerCase().includes(quote.toLowerCase())
          )
          .slice(0, 5)
      : [];

    return {
      ...base,
      score,
      feedback,
      matched_key_points,
      missing_key_points,
      evidence,
      pending: false,
    };
  } catch (err) {
    console.error("Evaluator: AI call failed", err);
    return {
      ...base,
      score: 0,
      feedback: "Evaluation temporarily unavailable. Manual review required.",
      matched_key_points: [],
      missing_key_points: [],
      evidence: [],
      pending: true,
    };
  }
}
