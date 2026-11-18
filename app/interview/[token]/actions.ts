
"use server";

import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export async function submitDSAAnswer(
    token: string,
    questionId: string,
    answer: string
) {
    if (
        !/^[a-f0-9]{64}$/i.test(token) ||
        !questionId ||
        !answer.trim() ||
        answer.length > 20000
    ) {
        return {
            success: false,
            error: "Please provide a valid answer.",
        };
    }

    const tokenHash = createHash("sha256")
        .update(token)
        .digest("hex");

    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
        "submit_candidate_dsa_answer",
        {
            p_token_hash: tokenHash,
            p_question_id: questionId,
            p_answer: answer.trim(),
        }
    );

    if (error) {
        return {
            success: false,
            error: "Unable to submit your answer. Please try again.",
        };
    }

    const result = data as {
        success?: boolean;
        error?: string;
        message?: string;
    };

    if (!result?.success) {
        return {
            success: false,
            error: result?.error ?? "Answer submission failed.",
        };
    }

    return {
        success: true,
        message: result.message ?? "Answer submitted successfully.",
    };
}
