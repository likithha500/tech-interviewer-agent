"use server";

import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    executeCode,
    type CodingLanguage,
    type TestCase,
} from "@/lib/code-runner";

const ALLOWED_CATEGORIES = [
    "DSA",
    "DBMS",
    "OS",
    "Networks",
    "OOP",
    "Coding",
] as const;

type RoundCategory = (typeof ALLOWED_CATEGORIES)[number];

const ALLOWED_LANGUAGES: CodingLanguage[] = [
    "python",
    "java",
    "cpp",
    "javascript",
];

function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

export async function submitRoundAnswer(
    token: string,
    category: RoundCategory,
    questionId: string,
    answer: string
) {
    if (
        !/^[a-f0-9]{64}$/i.test(token) ||
        !ALLOWED_CATEGORIES.includes(category) ||
        !questionId ||
        !answer.trim() ||
        answer.length > 20000
    ) {
        return {
            success: false,
            error: "Please provide a valid answer.",
            completed: false,
        };
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
        "submit_candidate_round_answer",
        {
            p_token_hash: hashToken(token),
            p_category: category,
            p_question_id: questionId,
            p_answer: answer.trim(),
        }
    );

    if (error) {
        console.error("Round submission error:", error.message);

        return {
            success: false,
            error: "Unable to submit your answer. Please try again.",
            completed: false,
        };
    }

    const result = data as {
        success?: boolean;
        error?: string;
        message?: string;
        completed?: boolean;
    };

    if (!result?.success) {
        return {
            success: false,
            error: result?.error ?? "Answer submission failed.",
            completed: false,
        };
    }

    return {
        success: true,
        message: result.message ?? "Answer submitted successfully.",
        completed: result.completed ?? false,
    };
}

export async function submitCodingAnswer(
    token: string,
    questionId: string,
    language: CodingLanguage,
    sourceCode: string
) {
    if (
        !/^[a-f0-9]{64}$/i.test(token) ||
        !questionId ||
        !ALLOWED_LANGUAGES.includes(language) ||
        !sourceCode.trim() ||
        sourceCode.length > 18000
    ) {
        return {
            success: false,
            error: "Please provide valid code and programming language.",
            completed: false,
        };
    }

    // Validate the candidate and current Coding question before Docker execution.
    const supabase = await createClient();

    const { data: currentQuestion, error: currentQuestionError } =
        await supabase.rpc("get_candidate_round_question", {
            p_token_hash: hashToken(token),
            p_category: "Coding",
        });

    const questionData = currentQuestion as {
        question_id?: string;
    } | null;

    if (
        currentQuestionError ||
        !questionData ||
        questionData.question_id !== questionId
    ) {
        return {
            success: false,
            error: "This question is no longer available or your interview session is invalid.",
            completed: false,
        };
    }

    const admin = createAdminClient();
    // Retrieve hidden test cases on the server only.
    const { data: question, error: questionError } = await admin
        .from("questions")
        .select("id, category, test_cases")
        .eq("id", questionId)
        .eq("category", "Coding")
        .eq("is_active", true)
        .maybeSingle();

    if (questionError || !question) {
        console.error("Coding question lookup failed:", questionError?.message);

        return {
            success: false,
            error: "Unable to load this coding question.",
            completed: false,
        };
    }

    const testCases = question.test_cases as TestCase[] | null;

    if (
        !Array.isArray(testCases) ||
        testCases.length === 0 ||
        testCases.length > 10 ||
        testCases.some(
            (testCase) =>
                !testCase ||
                !("input" in testCase) ||
                !("expected_output" in testCase)
        )
    ) {
        return {
            success: false,
            error: "Test cases are not configured correctly for this question.",
            completed: false,
        };
    }

    // Execute candidate code inside restricted Docker containers.
    const execution = await executeCode(
        language,
        sourceCode,
        testCases
    );

    if (!execution.success) {
        return {
            success: false,
            error: execution.error ?? "Code execution failed.",
            completed: false,
        };
    }

    // Submit the answer through the existing candidate RPC.
    const codingAnswer = JSON.stringify({
        language,
        sourceCode,
    });

    const submission = await submitRoundAnswer(
        token,
        "Coding",
        questionId,
        codingAnswer
    );

    if (!submission.success) {
        return submission;
    }

    // Find the interview and its Coding round for the execution record.
    const tokenHash = hashToken(token);

    const { data: interview, error: interviewError } = await admin
        .from("interviews")
        .select("id")
        .eq("candidate_access_token_hash", tokenHash)
        .maybeSingle();

    if (interviewError || !interview) {
        console.error("Interview lookup failed:", interviewError?.message);

        return {
            success: true,
            message: "Answer submitted, but the execution record could not be linked.",
            completed: submission.completed,
            passed: execution.passed,
            total: execution.total,
        };
    }

    const { data: round, error: roundError } = await admin
        .from("interview_rounds")
        .select("id")
        .eq("interview_id", interview.id)
        .eq("round_type", "Coding")
        .maybeSingle();

    if (roundError || !round) {
        console.error("Coding round lookup failed:", roundError?.message);

        return {
            success: true,
            message: "Answer submitted, but the execution record could not be linked.",
            completed: submission.completed,
            passed: execution.passed,
            total: execution.total,
        };
    }

    // Save execution details using the server-only admin client.
    const { error: saveError } = await admin
        .from("code_submissions")
        .insert({
            round_id: round.id,
            question_id: questionId,
            language,
            source_code: sourceCode,
            execution_result: {
                results: execution.results.map((result) => ({
                    passed: result.passed,
                    actualOutput: result.actualOutput,
                    error: result.error ?? null,
                })),
            },
            passed_test_cases: execution.passed,
            total_test_cases: execution.total,
        });

    if (saveError) {
        console.error("Code submission record failed:", saveError.message);
    }

    return {
        success: true,
        message: saveError
            ? "Answer submitted and executed, but the execution record could not be saved."
            : "Code executed and submitted successfully.",
        completed: submission.completed,
        passed: execution.passed,
        total: execution.total,
        testResults: execution.results.map((result) => ({
            passed: result.passed,
        })),
    };
}