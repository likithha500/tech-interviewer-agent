import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Building2, ShieldCheck, Sparkles, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import DemoATSTable, { DemoATSRecord } from "./DemoATSTable";

async function DemoATSContent() {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || user.app_metadata?.role !== "admin") {
    redirect("/login");
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("demo_ats_records")
    .select("*")
    .order("received_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        <p className="font-bold">Failed to load Demo ATS records:</p>
        <p className="mt-1">{error.message}</p>
        <p className="mt-2 text-xs text-rose-500">
          Note: If you have not executed the database migration yet, run the SQL script in `supabase/migrations/20261120000001_add_demo_ats.sql`.
        </p>
      </div>
    );
  }

  const records: DemoATSRecord[] = (data ?? []).map((row) => ({
    id: row.id,
    interview_id: row.interview_id,
    candidate_id: row.candidate_id,
    candidate_name: row.candidate_name,
    candidate_email: row.candidate_email,
    overall_score: Number(row.overall_score),
    skill_scores: Array.isArray(row.skill_scores) ? row.skill_scores : [],
    strengths: Array.isArray(row.strengths) ? row.strengths : [],
    weaknesses: Array.isArray(row.weaknesses) ? row.weaknesses : [],
    ai_recommendation: row.ai_recommendation as "Hire" | "Hold" | "Reject",
    final_human_decision: row.final_human_decision as "Hire" | "Hold" | "Reject",
    evaluation_feedback: row.evaluation_feedback,
    received_at: row.received_at,
  }));

  return <DemoATSTable records={records} />;
}

export default function DemoATSPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
            <Building2 className="h-3 w-3" />
            Simulated ATS Portal
          </span>
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
            Demo Mode Active
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Demo ATS Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Inspection portal for candidate scorecards and hiring decisions synchronized through the Demo ATS adapter.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="py-16 text-center text-sm text-slate-400">
            Loading Demo ATS scorecards...
          </div>
        }
      >
        <DemoATSContent />
      </Suspense>

      {/* Advisory Note */}
      <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 text-xs text-indigo-900">
        <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">About Demo ATS</p>
          <p className="mt-0.5 text-indigo-800 leading-relaxed">
            The Demo ATS provider allows evaluators and hiring panels to simulate end-to-end ATS scorecards without configuring third-party Greenhouse or Lever credentials. Pushed scorecards are saved into Supabase `demo_ats_records` with full audit logs and deduplication.
          </p>
        </div>
      </div>
    </div>
  );
}
