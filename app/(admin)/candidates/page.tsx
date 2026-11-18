
import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addCandidate } from "./actions";
import CandidateFilters from "./CandidateFilters";

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
      <p className="text-red-600">
        Unable to load candidates: {error.message}
      </p>
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
        <p className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          Candidate added successfully!
        </p>
      )}

      {params.error && (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {params.error}
        </p>
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
    <div className="space-y-6">
      {/* Add Candidate Form */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h1 className="mb-2 text-2xl font-semibold text-primary">
          Candidates
        </h1>

        <p className="mb-6 text-sm text-gray-500">
          Manage and register interview candidates.
        </p>

        <Suspense fallback={null}>
          <CandidateMessages searchParams={searchParams} />
        </Suspense>

        <h2 className="mb-4 text-lg font-semibold">
          Add New Candidate
        </h2>

        <form
          action={addCandidate}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium"
            >
              Full Name *
            </label>

            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={100}
              placeholder="Enter candidate name"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium"
            >
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
            <label
              htmlFor="applicationId"
              className="mb-1 block text-sm font-medium"
            >
              Application ID
            </label>

            <input
              id="applicationId"
              name="applicationId"
              type="text"
              maxLength={50}
              placeholder="APP-2026-001"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label
              htmlFor="college"
              className="mb-1 block text-sm font-medium"
            >
              College
            </label>

            <input
              id="college"
              name="college"
              type="text"
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

      {/* Candidate List */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-5">
          <h2 className="text-xl font-semibold">
            Registered Candidates
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Search, filter and manage registered candidates.
          </p>
        </div>

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

