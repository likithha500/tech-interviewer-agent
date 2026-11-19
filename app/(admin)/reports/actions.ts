
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runInterviewEvaluation } from "@/lib/evaluation-service";

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (
    error ||
    !user ||
    user.app_metadata?.role !== "admin"
  ) {
    redirect("/login");
  }
}

export async function triggerEvaluation(
  interviewId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  await requireAdmin();

  if (!interviewId) {
    return {
      success: false,
      error: "Interview ID is required.",
    };
  }

  const result = await runInterviewEvaluation(interviewId);

  if (result.success) {
    revalidatePath("/reports");
    revalidatePath("/");
  }

  return result.success
    ? { success: true }
    : { success: false, error: result.error };
}

// Final hiring decision must be made by a human admin.
export async function submitHumanReview(
  interviewId: string,
  decision: "Hire" | "Hold" | "Reject"
): Promise<{
  success: boolean;
  error?: string;
}> {
  await requireAdmin();

  if (!interviewId) {
    return {
      success: false,
      error: "Interview ID is required.",
    };
  }

  const allowedDecisions = ["Hire", "Hold", "Reject"];

  if (!allowedDecisions.includes(decision)) {
    return {
      success: false,
      error: "Invalid human review decision.",
    };
  }

  const admin = createAdminClient();

  const { data: report, error: reportError } = await admin
    .from("reports")
    .select("id")
    .eq("interview_id", interviewId)
    .maybeSingle();

  if (reportError) {
    return {
      success: false,
      error: reportError.message,
    };
  }

  if (!report) {
    return {
      success: false,
      error: "Generate the evaluation report first.",
    };
  }

  // Store the human decision separately from AI recommendation.
  const { error: updateError } = await admin
    .from("reports")
    .update({
      human_review_status: decision,
    })
    .eq("interview_id", interviewId);

  if (updateError) {
    return {
      success: false,
      error: updateError.message,
    };
  }

  revalidatePath("/reports");
  revalidatePath("/");

  return { success: true };
}
