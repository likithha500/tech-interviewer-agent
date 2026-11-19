
import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addCandidate } from "./actions";
import CandidateFilters from "./CandidateFilters";
import { UserPlus, Users, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

type CandidateRow = {
  id: string;
  name: string;
  email: string;
  applicationId: string;
  college: string;
  registered: string;
};

async function CandidatesList() {
  await connection();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("candidates")
    .select("id, name, email, application_id, college, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Unable to load candidates: {error.message}
      </div>
    );
  }

  const candidates: CandidateRow[] = (data ?? []).map((candidate) => ({
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
    applicationId: candidate.application_id ?? "—",
    college: candidate.college ?? "—",
    registered: candidate.created_at
      ? candidate.created_at.slice(0, 10).split("-").reverse().join("/")
      : "—",
  }));

  return <CandidateFilters candidates={candidates} />;
}

async function CandidateMessages({
  searchParams,
}: {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <>
      {params.success === "1" && (
        <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-sm font-medium text-emerald-800 shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Candidate added successfully! They are ready to be scheduled for an interview.</span>
        </div>
      )}

      {params.error && (
        <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-sm font-medium text-rose-800 shadow-xs">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{params.error}</span>
        </div>
      )}
    </>
  );
}

export default function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
}) {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
            <Users className="h-3 w-3" />
            Talent Pool
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Candidate Management
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Register candidates, organize applicant details, and prepare them for automated technical rounds.
        </p>
      </div>

      <Suspense fallback={null}>
        <CandidateMessages searchParams={searchParams} />
      </Suspense>

      {/* Add Candidate Form Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <UserPlus className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Register New Candidate
            </h2>
            <p className="text-xs text-slate-400">
              Add individual applicant details for upcoming interview rounds
            </p>
          </div>
        </div>

        <form
          action={addCandidate}
          className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2"
        >
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
            >
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={100}
              placeholder="e.g. Alex Morgan"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-3 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
            >
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              maxLength={254}
              placeholder="alex.morgan@example.com"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-3 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label
              htmlFor="applicationId"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
            >
              Application ID
            </label>
            <input
              id="applicationId"
              name="applicationId"
              type="text"
              maxLength={50}
              placeholder="e.g. APP-2026-089"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-3 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label
              htmlFor="college"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
            >
              College / University
            </label>
            <input
              id="college"
              name="college"
              type="text"
              maxLength={150}
              placeholder="e.g. Stanford University"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-3 focus:ring-indigo-100"
            />
          </div>

          <div className="pt-2 md:col-span-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-100 transition hover:bg-indigo-700 active:scale-98"
            >
              <UserPlus className="h-4 w-4" />
              Add Candidate
            </button>
          </div>
        </form>
      </div>

      {/* Candidate List Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Registered Candidates
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Search, filter, update and manage applicant profiles.
            </p>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="py-12 text-center text-sm text-slate-400">
              Loading candidates...
            </div>
          }
        >
          <CandidatesList />
        </Suspense>
      </div>
    </div>
  );
}
