
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EvaluateButton } from "./EvaluateButton";
import { SkillBreakdown } from "./SkillBreakdown";
import { HumanReviewButtons } from "./HumanReviewButtons";
import { connection } from "next/server";
import { Suspense } from "react";
import { BarChart3, ShieldCheck, CheckCircle2, AlertTriangle, Sparkles, User, Calendar, Award } from "lucide-react";

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

type InterviewRow = {
  id: string;
  status: string;
  created_at: string;
  candidate: { name: string; email: string } | null;
  report: ReportRow;
  skills: SkillRow[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function RecommendationBadge({
  value,
}: {
  value: string | null | undefined;
}) {
  if (!value) return <span className="text-xs text-slate-400 font-medium">Not evaluated</span>;
  const colors: Record<string, string> = {
    Hire: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Hold: "bg-amber-50 text-amber-700 border-amber-200",
    Reject: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${
        colors[value] ?? "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
      {value}
    </span>
  );
}

function ReviewBadge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-xs text-slate-400">—</span>;
  const colors: Record<string, string> = {
    Pending: "bg-amber-50 text-amber-700 border-amber-200",
    Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Rejected: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        colors[value] ?? "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
      {value}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

async function ReportsContent() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null; // layout handles redirect

  const admin = createAdminClient();

  // Fetch interviews with candidates and reports
  const { data: interviews, error } = await admin
    .from("interviews")
    .select(
      `
      id,
      status,
      created_at,
      candidates ( name, email ),
      reports (
        overall_score,
        recommendation,
        human_review_status,
        strengths,
        weaknesses
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        Failed to load reports: {error.message}
      </div>
    );
  }

  // Fetch all evaluations for all interviews
  const interviewIds = (interviews ?? []).map((i) => i.id as string);

  let evalsByInterview = new Map<string, SkillRow[]>();

  if (interviewIds.length > 0) {
    const { data: evals } = await admin
      .from("evaluations")
      .select("interview_id, skill, score, max_score, feedback, evidence")
      .in("interview_id", interviewIds);

    for (const ev of evals ?? []) {
      const iid = ev.interview_id as string;
      const list = evalsByInterview.get(iid) ?? [];
      list.push({
        skill: ev.skill as string,
        score: ev.score as number | null,
        max_score: ev.max_score as number | null,
        feedback: ev.feedback as string | null,
        evidence: ev.evidence as EvidenceItem[] | null,
      });
      evalsByInterview.set(iid, list);
    }
  }

  // Build typed rows
  const rows: InterviewRow[] = (interviews ?? []).map((item) => {
    const candidateRaw = Array.isArray(item.candidates)
      ? item.candidates[0]
      : item.candidates;
    const reportRaw = Array.isArray(item.reports)
      ? item.reports[0]
      : item.reports;

    return {
      id: item.id as string,
      status: item.status as string,
      created_at: item.created_at as string,
      candidate: candidateRaw as { name: string; email: string } | null,
      report: reportRaw as ReportRow,
      skills: evalsByInterview.get(item.id as string) ?? [],
    };
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
            <BarChart3 className="h-3 w-3" />
            Evaluation Intelligence
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Reports &amp; Scorecards
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Review evidence-backed AI scores, skill proficiencies, and submit final human hiring decisions.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Candidate</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Score</th>
                <th className="px-5 py-3.5">AI Suggestion</th>
                <th className="px-5 py-3.5">Human Decision</th>
                <th className="px-5 py-3.5">Proficiency Summary</th>
                <th className="px-5 py-3.5">Skill Breakdown</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {rows.map((item) => (
                <tr key={item.id} className="align-top transition-colors hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 font-bold text-xs text-indigo-700">
                        {item.candidate?.name?.slice(0, 2).toUpperCase() ?? "CA"}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {item.candidate?.name ?? "Unknown Candidate"}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {item.candidate?.email ?? ""}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-xs font-medium text-slate-500">
                    {new Date(item.created_at).toLocaleDateString("en-IN", {
                      dateStyle: "medium",
                      timeZone: "Asia/Kolkata",
                    })}
                  </td>

                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                      {item.status}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    {item.report?.overall_score != null ? (
                      <div className="flex items-center gap-1.5 font-extrabold text-slate-900 text-base">
                        <Award className="h-4 w-4 text-indigo-600" />
                        <span>{item.report.overall_score}%</span>
                      </div>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-400">
                        Pending
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <RecommendationBadge value={item.report?.recommendation} />
                    <p className="mt-1 text-[10px] text-slate-400">
                      Advisory only
                    </p>
                  </td>

                  <td className="px-5 py-4 min-w-[140px]">
                    <div className="flex flex-col gap-2">
                      <ReviewBadge value={item.report?.human_review_status} />

                      {item.report && (
                        <HumanReviewButtons
                          interviewId={item.id}
                          currentDecision={
                            item.report.human_review_status
                          }
                        />
                      )}
                    </div>
                  </td>

                  <td className="px-5 py-4 max-w-xs text-xs">
                    {item.report ? (
                      <div className="space-y-1.5">
                        {(item.report.strengths ?? []).length > 0 && (
                          <div className="rounded-lg bg-emerald-50/70 border border-emerald-100 p-2">
                            <span className="font-bold text-emerald-800 block text-[11px]">
                              Strengths:
                            </span>
                            <span className="text-emerald-700 mt-0.5 block">
                              {(item.report.strengths ?? []).join(", ")}
                            </span>
                          </div>
                        )}
                        {(item.report.weaknesses ?? []).length > 0 && (
                          <div className="rounded-lg bg-rose-50/70 border border-rose-100 p-2">
                            <span className="font-bold text-rose-800 block text-[11px]">
                              Weaknesses:
                            </span>
                            <span className="text-rose-700 mt-0.5 block">
                              {(item.report.weaknesses ?? []).join(", ")}
                            </span>
                          </div>
                        )}
                        {!(item.report.strengths ?? []).length &&
                          !(item.report.weaknesses ?? []).length && (
                            <span className="text-slate-400">—</span>
                          )}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="px-5 py-4 min-w-[200px]">
                    <SkillBreakdown skills={item.skills} />
                  </td>

                  <td className="px-5 py-4 text-right">
                    {item.status === "Completed" && (
                      <EvaluateButton interviewId={item.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!rows.length && (
          <div className="p-12 text-center text-sm text-slate-400">
            No interview scorecards found.
          </div>
        )}
      </div>

      {/* Human in the loop banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
        <ShieldCheck className="h-5 w-5 shrink-0 text-indigo-600 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-indigo-950">
            Human Oversight Principle
          </h3>
          <p className="mt-1 text-xs leading-5 text-indigo-800/90">
            AI evaluations are structured recommendations based on candidate responses and test-case results. Final hiring status must always be approved by the human hiring manager.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-slate-400">
          Loading evaluation reports...
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}
