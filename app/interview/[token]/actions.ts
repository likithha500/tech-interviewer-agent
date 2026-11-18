
"use server";

import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_CATEGORIES = [
    "DSA",
    "DBMS",
    "OS",
    "Networks",
    "OOP",
] as const;

type RoundCategory = (typeof ALLOWED_CATEGORIES)[number];

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

    const tokenHash = createHash("sha256")
        .update(token)
        .digest("hex");

    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
        "submit_candidate_round_answer",
        {
            p_token_hash: tokenHash,
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
