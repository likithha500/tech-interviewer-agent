
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getAdminClient() {
    const supabase = await createClient();

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user || user.app_metadata?.role !== "admin") {
        redirect("/login");
    }

    return supabase;
}

export async function scheduleInterview(formData: FormData) {
    const candidateId = String(formData.get("candidateId") ?? "").trim();
    const scheduledAt = String(formData.get("scheduledAt") ?? "").trim();

    if (!candidateId || !scheduledAt) {
        redirect("/interviews?error=Candidate%20and%20date%20are%20required");
    }

    const scheduledDate = new Date(`${scheduledAt}:00+05:30`);

    if (Number.isNaN(scheduledDate.getTime())) {
        redirect("/interviews?error=Invalid%20date%20or%20time");
    }

    if (scheduledDate.getTime() <= Date.now()) {
        redirect("/interviews?error=Choose%20a%20future%20date%20and%20time");
    }

    const supabase = await getAdminClient();

    const { data: candidate, error: candidateError } = await supabase
        .from("candidates")
        .select("id")
        .eq("id", candidateId)
        .maybeSingle();

    if (candidateError || !candidate) {
        redirect("/interviews?error=Candidate%20not%20found");
    }

    const { error } = await supabase.from("interviews").insert({
        candidate_id: candidateId,
        scheduled_at: scheduledDate.toISOString(),
        status: "Scheduled",
        round_plan_version: "three_round",
    });

    if (error) {
        redirect(`/interviews?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/interviews");
    revalidatePath("/");
    redirect("/interviews?success=scheduled");
}

export async function startInterview(id: string) {
    if (!id) redirect("/interviews?error=Invalid%20interview");

    const supabase = await getAdminClient();

    const { data, error } = await supabase
        .from("interviews")
        .update({
            status: "In Progress",
            started_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "Scheduled")
        .select("id")
        .maybeSingle();

    if (error) {
        redirect(`/interviews?error=${encodeURIComponent(error.message)}`);
    }

    if (!data) {
        redirect("/interviews?error=Interview%20could%20not%20be%20started");
    }

    revalidatePath("/interviews");
    revalidatePath("/");
    redirect("/interviews?success=started");
}

export async function completeInterview(id: string) {
    if (!id) redirect("/interviews?error=Invalid%20interview");

    const supabase = await getAdminClient();

    const { data, error } = await supabase
        .from("interviews")
        .update({
            status: "Completed",
            completed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "In Progress")
        .select("id")
        .maybeSingle();

    if (error) {
        redirect(`/interviews?error=${encodeURIComponent(error.message)}`);
    }

    if (!data) {
        redirect("/interviews?error=Interview%20could%20not%20be%20completed");
    }

    revalidatePath("/interviews");
    revalidatePath("/");
    redirect("/interviews?success=completed");
}
