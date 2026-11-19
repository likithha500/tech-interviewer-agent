/**
 * POST /api/admin/evaluate
 *
 * Triggers evaluation for a given interview.
 * Protected: requires a valid admin session.
 * Body: { interviewId: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runInterviewEvaluation } from "@/lib/evaluation-service";

export async function POST(request: NextRequest) {
  // 1. Auth check – admin only
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user || user.app_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: { interviewId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const interviewId = typeof body.interviewId === "string"
    ? body.interviewId.trim()
    : "";

  if (!interviewId) {
    return NextResponse.json(
      { error: "interviewId is required" },
      { status: 400 }
    );
  }

  // 3. Run evaluation
  const result = await runInterviewEvaluation(interviewId);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Evaluation failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    skillCount: result.skills?.length ?? 0,
  });
}
