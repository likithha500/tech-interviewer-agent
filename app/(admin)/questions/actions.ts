
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

export async function addQuestion(formData: FormData) {
    const category = String(formData.get("category") ?? "").trim();
    const topic = String(formData.get("topic") ?? "").trim();
    const difficulty = String(formData.get("difficulty") ?? "").trim();
    const question = String(formData.get("question") ?? "").trim();
    const expectedAnswer = String(formData.get("expectedAnswer") ?? "").trim();
    const timeComplexity = String(formData.get("timeComplexity") ?? "").trim();
    const spaceComplexity = String(formData.get("spaceComplexity") ?? "").trim();
    const marks = Number(formData.get("marks"));

    if (
        !category ||
        !topic ||
        !question ||
        !expectedAnswer ||
        !["Easy", "Medium", "Hard"].includes(difficulty) ||
        !Number.isInteger(marks) ||
        marks < 1 ||
        marks > 100
    ) {
        redirect("/questions?error=Please%20enter%20valid%20question%20details");
    }

    const supabase = await getAdminClient();

    const { error } = await supabase.from("questions").insert({
        category,
        topic,
        difficulty,
        question,
        expected_answer: expectedAnswer,
        time_complexity: timeComplexity || null,
        space_complexity: spaceComplexity || null,
        marks,
        evaluation_criteria: {},
        test_cases: [],
        is_active: true,
    });

    if (error) {
        redirect(`/questions?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/questions");
    revalidatePath("/");
    redirect("/questions?success=added");
}

export async function toggleQuestionStatus(id: string, isActive: boolean) {
    if (!id) {
        redirect("/questions?error=Invalid%20question");
    }

    const supabase = await getAdminClient();

    const { data, error } = await supabase
        .from("questions")
        .update({ is_active: isActive })
        .eq("id", id)
        .select("id")
        .maybeSingle();

    if (error) {
        redirect(`/questions?error=${encodeURIComponent(error.message)}`);
    }

    if (!data) {
        redirect("/questions?error=Question%20not%20found");
    }

    revalidatePath("/questions");
    revalidatePath("/");
    redirect("/questions?success=updated");
}
