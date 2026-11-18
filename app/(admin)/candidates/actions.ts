
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function addCandidate(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const applicationId = String(
        formData.get("applicationId") ?? ""
    ).trim();
    const college = String(formData.get("college") ?? "").trim();

    if (!name || !email) {
        redirect("/candidates?error=Name%20and%20email%20are%20required");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        redirect("/candidates?error=Invalid%20email%20address");
    }

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || user.app_metadata?.role !== "admin") {
        redirect("/login");
    }

    const { error } = await supabase.from("candidates").insert({
        name,
        email,
        application_id: applicationId || null,
        college: college || null,
    });

    if (error) {
        const message =
            error.code === "23505"
                ? "Application ID already exists"
                : error.message;

        redirect(`/candidates?error=${encodeURIComponent(message)}`);
    }

    revalidatePath("/candidates");
    redirect("/candidates?success=1");
}
