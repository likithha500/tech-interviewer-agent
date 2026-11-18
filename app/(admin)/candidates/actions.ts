
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

export async function updateCandidate(
    id: string,
    formData: FormData
) {
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const applicationId = String(
        formData.get("applicationId") ?? ""
    ).trim();
    const college = String(formData.get("college") ?? "").trim();

    if (!id || !name || !email) {
        return {
            success: false,
            error: "Name and email are required.",
        };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return {
            success: false,
            error: "Invalid email address.",
        };
    }

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || user.app_metadata?.role !== "admin") {
        return {
            success: false,
            error: "Unauthorized access.",
        };
    }

    const { data, error } = await supabase
        .from("candidates")
        .update({
            name,
            email,
            application_id: applicationId || null,
            college: college || null,
        })
        .eq("id", id)
        .select("id")
        .maybeSingle();

    if (error) {
        return {
            success: false,
            error:
                error.code === "23505"
                    ? "Application ID already exists."
                    : error.message,
        };
    }

    if (!data) {
        return {
            success: false,
            error: "Candidate not found or update not permitted.",
        };
    }

    revalidatePath("/candidates");

    return { success: true };
}

export async function deleteCandidate(id: string) {
    if (!id) {
        return {
            success: false,
            error: "Invalid candidate ID.",
        };
    }

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || user.app_metadata?.role !== "admin") {
        return {
            success: false,
            error: "Unauthorized access.",
        };
    }

    const { data, error } = await supabase
        .from("candidates")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();

    if (error) {
        return {
            success: false,
            error:
                error.code === "23503"
                    ? "This candidate has associated records and cannot be deleted."
                    : error.message,
        };
    }

    if (!data) {
        return {
            success: false,
            error: "Candidate not found or deletion not permitted.",
        };
    }

    revalidatePath("/candidates");

    return { success: true };
}
