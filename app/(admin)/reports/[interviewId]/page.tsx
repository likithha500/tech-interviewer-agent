import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  User,
  Layers,
  ChevronRight,
  Code2,
} from "lucide-react";
import { EvaluateButton } from "../EvaluateButton";
import { SkillBreakdown } from "../SkillBreakdown";
import { HumanReviewButtons } from "../HumanReviewButtons";

// ─── Types ────────────────────────────────────────────────────────────────────

type EvidenceItem = {
  questionId: string;
  question: string;
  score: number;
  maxScore: number;
  feedback: string;
  matched_key_points: string[];
  missing_key_points: string[];
  quotes: string[];
};

type SkillRow = {
  skill: string;
  score: number | null;
  max_score: number | null;
  feedback: string | null;
  evidence: EvidenceItem[] | null;
};

type ReportRow = {
  overall_score: number | null;
  recommendation: string | null;
  human_review_status: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
} | null;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CandidateReportDetailPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  await connection();

  const { interviewId } = await params;

  if (!interviewId) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null; // layout handles redirect to login

  const admin = createAdminClient();

  // 1. Fetch interview, candidate and report
  const { data: interview, error: interviewError } = await admin
    .from("interviews")
    .select(
      `
      id,
      status,
      created_at,
      scheduled_at,
      candidates ( name, email, college, application_id ),
      reports (
        overall_score,
        recommendation,
        human_review_status,
        strengths,
        weaknesses,
        created_at
      )
    `
    )
    .eq("id", interviewId)
    .maybeSingle();

  if (interviewError || !interview) {
    notFound();
  }

  const candidateRaw = Array.isArray(interview.candidates)
    ? interview.candidates[0]
    : interview.candidates;
  const reportRaw = Array.isArray(interview.reports)
    ? interview.reports[0]
    : interview.reports;

  const candidate = candidateRaw as {
    name: string;
    email: string;
    college?: string | null;
    application_id?: string | null;
  } | null;

  const report = reportRaw as ReportRow;

  // 2. Fetch skill-level evaluations
  const { data: evaluations } = await admin
    .from("evaluations")
    .select("skill, score, max_score, feedback, evidence")
    .eq("interview_id", interviewId);

  const skills: SkillRow[] = (evaluations ?? []).map((ev) => ({
    skill: ev.skill as string,
    score: ev.score as number | null,
    max_score: ev.max_score as number | null,
    feedback: ev.feedback as string | null,
    evidence: ev.evidence as EvidenceItem[] | null,
  }));

  const hasScore = report?.overall_score != null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Navigation Breadcrumb / Back button */}
      <div>
        <Link
          href="/reports"
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Candidate Results</span>
        </Link>
      </div>

      {/* Candidate Profile Header Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-slate-100 pb-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 font-extrabold text-base text-indigo-700 border border-indigo-100 shadow-2xs">
              {candidate?.name?.slice(0, 2).toUpperCase() || "CA"}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {candidate?.name ?? "Unknown Candidate"}
                </h1>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    interview.status === "Completed"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-indigo-50 text-indigo-700 border-indigo-200"
                  }`}
                >
                  {interview.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1.5 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {candidate?.email || "—"}
                </span>
                {candidate?.application_id && (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">
                    ID: {candidate.application_id}
                  </span>
                )}
                {candidate?.college && (
                  <span>College: {candidate.college}</span>
                )}
              </div>
            </div>
          </div>

          {/* Action: Run Evaluation */}
          {interview.status === "Completed" && (
            <div className="flex flex-col sm:items-end">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Assessment Actions
              </span>
              <EvaluateButton interviewId={interviewId} />
            </div>
          )}
        </div>

        {/* Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 text-xs">
          <div>
            <p className="text-slate-400 font-medium">Interview Date</p>
            <p className="font-semibold text-slate-800 mt-1">
              {new Date(interview.created_at).toLocaleDateString("en-IN", {
                dateStyle: "medium",
                timeZone: "Asia/Kolkata",
              })}
            </p>
          </div>
          <div>
            <p className="text-slate-400 font-medium">Session Status</p>
            <p className="font-semibold text-slate-800 mt-1">{interview.status}</p>
          </div>
          <div>
            <p className="text-slate-400 font-medium">AI Advisory</p>
            <div className="mt-1">
              {report?.recommendation ? (
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                    report.recommendation === "Hire"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : report.recommendation === "Hold"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {report.recommendation}
                </span>
              ) : (
                <span className="text-slate-400">Not evaluated</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-slate-400 font-medium">Human Review</p>
            <div className="mt-1">
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  report?.human_review_status === "Hire" ||
                  report?.human_review_status === "Approved"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : report?.human_review_status === "Reject" ||
                      report?.human_review_status === "Rejected"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {report?.human_review_status || "Pending"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* When report is not evaluated yet */}
      {!hasScore ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 mb-4">
            <Clock className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Evaluation Not Generated Yet
          </h2>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            {interview.status === "Completed"
              ? 'This candidate has finished their interview. Click "Run AI Eval" above to produce evidence-backed scores and skill breakdown.'
              : 'This interview has not been marked as "Completed" yet. Complete the interview to generate the evaluation.'}
          </p>
        </div>
      ) : (
        /* Evaluation Details Grid */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Overall Score & Strengths/Weaknesses */}
          <div className="space-y-6 lg:col-span-1">
            {/* Overall Score Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Overall AI Performance Score
              </span>
              <div className="my-4 flex items-center justify-center gap-2">
                <span className="text-5xl font-black tracking-tight text-slate-900">
                  {report?.overall_score}%
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Calculated across DSA, Core CS, and Dockerized Coding test runs.
              </p>

              {/* Recommendation highlight */}
              <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  AI Recommendation
                </span>
                <span
                  className={`mt-1 inline-flex items-center rounded-md px-3 py-1 text-sm font-extrabold ${
                    report?.recommendation === "Hire"
                      ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                      : report?.recommendation === "Hold"
                      ? "text-amber-700 bg-amber-50 border border-amber-200"
                      : "text-rose-700 bg-rose-50 border border-rose-200"
                  }`}
                >
                  {report?.recommendation}
                </span>
                <p className="text-[11px] text-slate-400 mt-1">
                  Advisory only — requires panel sign-off
                </p>
              </div>
            </div>

            {/* Human Review Decision Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Human Panel Review
                </h3>
              </div>

              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Confirm or override the AI assessment with your final hiring decision:
              </p>

              <HumanReviewButtons
                interviewId={interviewId}
                currentDecision={report?.human_review_status ?? null}
              />
            </div>

            {/* Strengths & Weaknesses Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Key Proficiency Insights
              </h3>

              {/* Strengths */}
              <div>
                <span className="text-xs font-bold text-emerald-700 block mb-1.5">
                  Demonstrated Strengths
                </span>
                {(report?.strengths ?? []).length > 0 ? (
                  <div className="space-y-1.5">
                    {(report?.strengths ?? []).map((s, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg bg-emerald-50/70 border border-emerald-100 p-2 text-xs text-emerald-800"
                      >
                        ✓ {s}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">None highlighted</p>
                )}
              </div>

              {/* Weaknesses */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-rose-700 block mb-1.5">
                  Areas for Improvement
                </span>
                {(report?.weaknesses ?? []).length > 0 ? (
                  <div className="space-y-1.5">
                    {(report?.weaknesses ?? []).map((w, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg bg-rose-50/70 border border-rose-100 p-2 text-xs text-rose-800"
                      >
                        ✗ {w}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">None highlighted</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Skill Breakdown & Evidence */}
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Skill-by-Skill Evaluation
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Detailed scoring, criteria matching, and response quotes
                  </p>
                </div>
                <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                  {skills.length} Skills Evaluated
                </span>
              </div>

              {skills.length > 0 ? (
                <div className="space-y-5">
                  {skills.map((s) => {
                    const pct =
                      s.max_score && s.max_score > 0
                        ? Math.round(((s.score ?? 0) / s.max_score) * 100)
                        : null;

                    return (
                      <div
                        key={s.skill}
                        className="rounded-xl border border-slate-100 bg-slate-50/60 p-4.5 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900">
                            {s.skill}
                          </span>
                          <span className="text-xs font-extrabold text-slate-700">
                            {s.score ?? "?"} / {s.max_score ?? "?"} pts{" "}
                            {pct != null && (
                              <span
                                className={`ml-1.5 ${
                                  pct >= 70
                                    ? "text-emerald-600"
                                    : pct >= 50
                                    ? "text-amber-600"
                                    : "text-rose-600"
                                }`}
                              >
                                ({pct}%)
                              </span>
                            )}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        {pct != null && (
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                pct >= 70
                                  ? "bg-emerald-500"
                                  : pct >= 50
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}

                        {s.feedback && (
                          <p className="text-xs text-slate-600 italic leading-relaxed">
                            {s.feedback}
                          </p>
                        )}

                        {/* Question-level evidence accordion */}
                        {Array.isArray(s.evidence) && s.evidence.length > 0 && (
                          <details className="mt-2 group">
                            <summary className="cursor-pointer text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                              View {s.evidence.length} question evidence detail(s)
                            </summary>
                            <div className="mt-2.5 space-y-2.5">
                              {s.evidence.map((item) => (
                                <div
                                  key={item.questionId}
                                  className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-2xs space-y-1.5"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-semibold text-slate-900 leading-snug">
                                      {item.question}
                                    </p>
                                    <span className="shrink-0 font-bold text-slate-700">
                                      {item.score}/{item.maxScore}
                                    </span>
                                  </div>

                                  {item.feedback && (
                                    <p className="text-xs text-slate-500 italic">
                                      {item.feedback}
                                    </p>
                                  )}

                                  {item.matched_key_points.length > 0 && (
                                    <div className="flex items-start gap-1 text-emerald-700">
                                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 mt-0.5" />
                                      <span>{item.matched_key_points.join(", ")}</span>
                                    </div>
                                  )}

                                  {item.missing_key_points.length > 0 && (
                                    <div className="flex items-start gap-1 text-rose-700">
                                      <span className="h-3.5 w-3.5 shrink-0 text-rose-600 font-bold text-center leading-none">✗</span>
                                      <span>{item.missing_key_points.join(", ")}</span>
                                    </div>
                                  )}

                                  {item.quotes.length > 0 && (
                                    <div className="mt-1 space-y-1 rounded bg-slate-50 p-2 border border-slate-100 font-mono text-[11px] text-slate-600 italic">
                                      {item.quotes.map((q, i) => (
                                        <p key={i}>&ldquo;{q}&rdquo;</p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No individual skill breakdowns found for this session.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
