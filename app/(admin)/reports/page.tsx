
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import CandidateResultsTable, { CandidateResultItem } from "./CandidateResultsTable";
import { connection } from "next/server";
import { Suspense } from "react";
import { BarChart3, ShieldCheck } from "lucide-react";

async function CandidateResultsContent() {
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
        human_review_status
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        Failed to load results: {error.message}
      </div>
    );
  }

  // Format into compact items
  const results: CandidateResultItem[] = (interviews ?? []).map((item) => {
    const candidateRaw = Array.isArray(item.candidates)
      ? item.candidates[0]
      : item.candidates;
    const reportRaw = Array.isArray(item.reports)
      ? item.reports[0]
      : item.reports;

    return {
      interviewId: item.id as string,
      candidateName: candidateRaw?.name ?? "Unknown Candidate",
      candidateEmail: candidateRaw?.email ?? "",
      status: item.status as string,
      overallScore: reportRaw?.overall_score ?? null,
      recommendation: reportRaw?.recommendation ?? null,
      humanReviewStatus: reportRaw?.human_review_status ?? null,
      createdAt: item.created_at as string,
    };
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
            <BarChart3 className="h-3 w-3" />
            Performance &amp; Evaluation
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Candidate Results
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Overview of candidate scores and interview outcomes. Select &quot;View Report&quot; for detailed skill breakdowns and human review.
        </p>
      </div>

      {/* Main Results Table with Search Filter */}
      <CandidateResultsTable results={results} />

      {/* Human Oversight Advisory Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
        <ShieldCheck className="h-5 w-5 shrink-0 text-indigo-600 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-indigo-950">
            Advisory Evaluation Policy
          </h3>
          <p className="mt-1 text-xs leading-5 text-indigo-800/90">
            Scores and recommendations are generated automatically based on candidate answers and code test case runs. Final hiring outcomes are confirmed by your human review panel inside each detailed candidate report.
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
          Loading candidate results...
        </div>
      }
    >
      <CandidateResultsContent />
    </Suspense>
  );
}
