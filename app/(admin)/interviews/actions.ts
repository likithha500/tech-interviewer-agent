
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function scheduleInterview(formData: FormData) {
    const candidateId = String(formData.get("candidateId") ?? "").trim();
    const scheduledAt = String(formData.get("scheduledAt") ?? "").trim();

    if (!candidateId || !scheduledAt) {
        redirect("/interviews?error=Please%20select%20a%20candidate%20and%20date%20and%20time");
    }

    // Interpret the selected date/time as Indian Standard Time.
    const scheduledDate = new Date(`${scheduledAt}:00+05:30`);

    if (Number.isNaN(scheduledDate.getTime())) {
        redirect("/interviews?error=Invalid%20date%20or%20time");
    }

    if (scheduledDate.getTime() <= Date.now()) {
        redirect("/interviews?error=Please%20choose%20a%20future%20date%20and%20time");
    }

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || user.app_metadata?.role !== "admin") {
        redirect("/login");
    }

    // Confirm that the selected candidate exists.
    const { data: candidate, error: candidateError } = await supabase
        .from("candidates")
        .select("id")
        .eq("id", candidateId)
        .maybeSingle();

    if (candidateError || !candidate) {
        redirect("/interviews?error=Selected%20candidate%20was%20not%20found");
    }

    const { error } = await supabase.from("interviews").insert({
        candidate_id: candidateId,
        scheduled_at: scheduledDate.toISOString(),
        status: "Scheduled",
    });

    if (error) {
        redirect(`/interviews?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/interviews");
    revalidatePath("/");

    redirect("/interviews?success=scheduled");
}
