
import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  scheduleInterview,
  startInterview,
  completeInterview,
} from "./actions";
import {
  Briefcase,
  Calendar,
  Clock,
  Play,
  CheckCircle,
  User,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface Candidate {
  id: string;
  name: string;
  email: string;
}

interface InterviewRow {
  id: string;
  candidate_id: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  candidates: {
    name: string;
    email: string;
  } | null;
}

async function InterviewsList() {
  await connection();

  const supabase = await createClient();

  const [
    { data: interviews, error: interviewError },
    { data: candidates, error: candidateError },
  ] = await Promise.all([
    supabase
      .from("interviews")
      .select(`
                id,
                candidate_id,
                status,
                scheduled_at,
                created_at,
                candidates (
                    name,
                    email
                )
            `)
      .order("created_at", { ascending: false }),

    supabase
      .from("candidates")
      .select("id, name, email")
      .order("name", { ascending: true }),
  ]);

  const rows = (interviews ?? []) as unknown as InterviewRow[];
  const candidateList = (candidates ?? []) as Candidate[];

  const scheduledCount = rows.filter(
    (item) => item.status === "Scheduled"
  ).length;

  const inProgressCount = rows.filter(
    (item) => item.status === "In Progress"
  ).length;

  const completedCount = rows.filter(
    (item) => item.status === "Completed"
  ).length;

  return (
    <div className="space-y-8">
      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Scheduled"
          value={scheduledCount}
          description="Waiting to start"
          badgeColor="bg-amber-50 text-amber-700"
        />
        <StatCard
          label="In Progress"
          value={inProgressCount}
          description="Active sessions"
          badgeColor="bg-indigo-50 text-indigo-700"
        />
        <StatCard
          label="Completed"
          value={completedCount}
          description="Ready for evaluation"
          badgeColor="bg-emerald-50 text-emerald-700"
        />
      </div>

      {interviewError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Could not load interviews: {interviewError.message}
        </div>
      )}

      {candidateError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Could not load candidates: {candidateError.message}
        </div>
      )}

      {/* Schedule Interview Form */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Schedule New Interview
            </h2>
            <p className="text-xs text-slate-400">
              Select an applicant and configure the session start time (IST)
            </p>
          </div>
        </div>

        <form
          action={scheduleInterview}
          className="mt-5 grid gap-4 sm:grid-cols-3"
        >
          <div>
            <label
              htmlFor="candidateId"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
            >
              Candidate <span className="text-rose-500">*</span>
            </label>

            <select
              id="candidateId"
              name="candidateId"
              required
              defaultValue=""
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-3 focus:ring-indigo-100"
            >
              <option value="" disabled>
                Select a candidate...
              </option>

              {candidateList.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name} ({candidate.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="scheduledAt"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
            >
              Date & Time (IST) <span className="text-rose-500">*</span>
            </label>

            <input
              id="scheduledAt"
              name="scheduledAt"
              type="datetime-local"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-3 focus:ring-indigo-100"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={candidateList.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-100 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PlusCircle className="h-4 w-4" />
              Schedule Interview
            </button>
          </div>
        </form>

        {candidateList.length === 0 && (
          <p className="mt-3 text-xs text-amber-600">
            Please register a candidate first before scheduling an interview.
          </p>
        )}
      </section>

      {/* All Interviews List */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">
            All Interview Sessions
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Manage stage progression, launch sessions, and finalize candidate rounds.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="font-semibold text-slate-700">
              No interviews scheduled yet.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Schedule your first interview using the form above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Candidate</th>
                  <th className="px-6 py-3.5">Scheduled Date</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.map((interview) => (
                  <tr key={interview.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 font-bold text-xs text-indigo-700">
                          {interview.candidates?.name?.slice(0, 2).toUpperCase() ?? "CA"}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {interview.candidates?.name ?? "Unknown Candidate"}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {interview.candidates?.email ?? "—"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs font-medium text-slate-600">
                      {interview.scheduled_at ? (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(interview.scheduled_at).toLocaleString(
                            "en-IN",
                            {
                              dateStyle: "medium",
                              timeStyle: "short",
                              timeZone: "Asia/Kolkata",
                            }
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">Not specified</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={interview.status} />
                    </td>

                    <td className="px-6 py-4 text-right">
                      {interview.status === "Scheduled" && (
                        <form action={startInterview.bind(null, interview.id)}>
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            Start Interview
                          </button>
                        </form>
                      )}

                      {interview.status === "In Progress" && (
                        <form action={completeInterview.bind(null, interview.id)}>
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Complete Interview
                          </button>
                        </form>
                      )}

                      {interview.status === "Completed" && (
                        <span className="text-xs font-medium text-slate-400">
                          Session Finished
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
  badgeColor,
}: {
  label: string;
  value: number;
  description: string;
  badgeColor: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeColor}`}>
          {label}
        </span>
      </div>
      <p className="mt-3 text-3xl font-extrabold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Scheduled: "bg-amber-50 text-amber-700 border-amber-200",
    "In Progress": "bg-indigo-50 text-indigo-700 border-indigo-200",
    Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        styles[status] ?? "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
      {status}
    </span>
  );
}

async function InterviewMessages({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const params = await searchParams;

  const messages: Record<string, string> = {
    scheduled: "Interview scheduled successfully.",
    started: "Interview started successfully.",
    completed: "Interview marked as completed.",
  };

  if (params.success && messages[params.success]) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-sm font-medium text-emerald-800 shadow-xs">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
        <span>{messages[params.success]}</span>
      </div>
    );
  }

  if (params.error) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-sm font-medium text-rose-800 shadow-xs">
        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
        <span>{params.error}</span>
      </div>
    );
  }

  return null;
}

export default function InterviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
            <Briefcase className="h-3 w-3" />
            Interview Logistics
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Interview Management
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Schedule, launch, and monitor candidate assessment sessions in real-time.
        </p>
      </div>

      <Suspense fallback={null}>
        <InterviewMessages searchParams={searchParams} />
      </Suspense>

      <Suspense
        fallback={
          <div className="py-12 text-center text-sm text-slate-400">
            Loading interviews...
          </div>
        }
      >
        <InterviewsList />
      </Suspense>
    </div>
  );
}
