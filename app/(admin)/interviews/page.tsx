
import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scheduleInterview } from "./actions";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Interview Management
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Schedule and manage candidate interviews.
        </p>
      </div>

      {interviewError && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Could not load interviews: {interviewError.message}
        </p>
      )}

      {candidateError && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Could not load candidates: {candidateError.message}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Scheduled" value={scheduledCount} />
        <StatCard label="In Progress" value={inProgressCount} />
        <StatCard label="Completed" value={completedCount} />
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Schedule an Interview
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Select a candidate and set the interview date and time.
          Times are interpreted as Indian Standard Time.
        </p>

        <form action={scheduleInterview} className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="candidateId"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Candidate
            </label>

            <select
              id="candidateId"
              name="candidateId"
              required
              defaultValue=""
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="" disabled>
                Select candidate
              </option>

              {candidateList.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name} ({candidate.email})
                </option>
              ))}
            </select>

            {candidateList.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                Add a candidate before scheduling an interview.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="scheduledAt"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Date and time
            </label>

            <input
              id="scheduledAt"
              name="scheduledAt"
              type="datetime-local"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={candidateList.length === 0}
              className="w-full rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Schedule Interview
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            All Interviews
          </h2>
        </div>

        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="font-medium text-gray-700">
              No interviews scheduled yet.
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Use the form above to schedule your first interview.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Candidate</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Scheduled At</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {rows.map((interview) => (
                  <tr key={interview.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {interview.candidates?.name ?? "Unknown"}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {interview.candidates?.email ?? "—"}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {interview.scheduled_at
                        ? new Date(interview.scheduled_at).toLocaleString(
                          "en-IN",
                          {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: "Asia/Kolkata",
                          }
                        )
                        : "Not specified"}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${interview.status === "Completed"
                          ? "bg-green-100 text-green-700"
                          : interview.status === "In Progress"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                        {interview.status}
                      </span>
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

async function InterviewMessages({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const params = await searchParams;

  if (params.success === "scheduled") {
    return (
      <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
        Interview scheduled successfully.
      </p>
    );
  }

  if (params.error) {
    return (
      <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
        {params.error}
      </p>
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
    <div className="space-y-4">
      <Suspense fallback={<p className="text-sm text-gray-500">Loading messages...</p>}>
        <InterviewMessages searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<p className="text-sm text-gray-500">Loading interviews...</p>}>
        <InterviewsList />
      </Suspense>
    </div>
  );
}
