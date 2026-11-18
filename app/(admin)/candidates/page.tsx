
import { Suspense } from "react";
import { connection } from "next/server";
import Table from "@/components/Table";
import { createClient } from "@/lib/supabase/server";
import { addCandidate } from "./actions";

type CandidateRow = {
  id: string;
  name: string;
  email: string;
  applicationId: string;
  college: string;
  registered: string;
};

const columns = [
  { header: "Name", accessor: "name" as keyof CandidateRow },
  { header: "Email", accessor: "email" as keyof CandidateRow },
  { header: "Application ID", accessor: "applicationId" as keyof CandidateRow },
  { header: "College", accessor: "college" as keyof CandidateRow },
  { header: "Registered", accessor: "registered" as keyof CandidateRow },
];

async function CandidatesList() {
  await connection();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("candidates")
    .select("id, name, email, application_id, college, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-red-600">Unable to load candidates: {error.message}</p>;
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

  return (
    <>
      <div className="mb-4 text-sm text-gray-600">
        Total candidates: <strong>{candidates.length}</strong>
      </div>

      {candidates.length > 0 ? (
        <Table columns={columns} data={candidates} />
      ) : (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium text-gray-700">No candidates registered yet.</p>
          <p className="mt-1 text-sm text-gray-500">
            Candidate records will appear here when added.
          </p>
        </div>
      )}
    </>
  );
}

async function CandidateMessages({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      {params.success === "1" && (
        <p className="mb-4 rounded bg-green-50 p-3 text-sm text-green-700">
          Candidate added successfully!
        </p>
      )}

      {params.error && (
        <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
          {params.error}
        </p>
      )}
    </>
  );
}

export default function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <h1 className="mb-6 text-2xl font-semibold text-primary">
          Candidates
        </h1>

        <Suspense fallback={null}>
          <CandidateMessages searchParams={searchParams} />
        </Suspense>

        <h2 className="mb-4 text-lg font-semibold">Add New Candidate</h2>

        <form action={addCandidate} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              Full Name *
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={100}
              placeholder="Enter candidate name"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email Address *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              maxLength={254}
              placeholder="candidate@example.com"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="applicationId" className="mb-1 block text-sm font-medium">
              Application ID
            </label>
            <input
              id="applicationId"
              name="applicationId"
              maxLength={50}
              placeholder="APP-2026-001"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="college" className="mb-1 block text-sm font-medium">
              College
            </label>
            <input
              id="college"
              name="college"
              maxLength={150}
              placeholder="Enter college name"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-primary px-5 py-2 text-white hover:opacity-90"
            >
              + Add Candidate
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-5 text-xl font-semibold">Registered Candidates</h2>

        <Suspense
          fallback={
            <p className="py-8 text-center text-gray-500">
              Loading candidates...
            </p>
          }
        >
          <CandidatesList />
        </Suspense>
      </div>
    </div>
  );
}
