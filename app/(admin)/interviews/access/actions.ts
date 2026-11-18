
"use server";

import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export async function generateCandidateAccessLink(interviewId: string) {
    if (!interviewId) {
        return { success: false, error: "Invalid interview ID." };
    }

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || user.app_metadata?.role !== "admin") {
        return { success: false, error: "Unauthorized access." };
    }

    // Generate a cryptographically secure, unpredictable token.
    const token = randomBytes(32).toString("hex");

    // Store only the SHA-256 hash in the database.
    const tokenHash = createHash("sha256")
        .update(token)
        .digest("hex");

    const { data, error } = await supabase
        .from("interviews")
        .update({
            candidate_access_token_hash: tokenHash,
        })
        .eq("id", interviewId)
        .select("id")
        .maybeSingle();

    if (error) {
        return { success: false, error: error.message };
    }

    if (!data) {
        return { success: false, error: "Interview not found." };
    }

    return {
        success: true,
        path: `/interview/${token}`,
    };
}
