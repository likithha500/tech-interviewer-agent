"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runInterviewEvaluation } from "@/lib/evaluation-service";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || user.app_metadata?.role !== "admin") {
    redirect("/login");
  }
}

export async function triggerEvaluation(interviewId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  await requireAdmin();

  if (!interviewId) {
    return { success: false, error: "Interview ID is required." };
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
