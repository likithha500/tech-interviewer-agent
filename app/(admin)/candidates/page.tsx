
import { Suspense } from "react";
import { connection } from "next/server";
import Table from "@/components/Table";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <>
      <div className="mb-4 text-sm text-gray-600">
        Total candidates: <strong>{candidates.length}</strong>
      </div>

      {candidates.length > 0 ? (
        <Table columns={columns} data={candidates} />
      ) : (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium text-gray-700">
            No candidates registered yet.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Candidate records will appear here when added.
          </p>
        </div>
      )}
    </>
  );
}

export default function CandidatesPage() {
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-primary">
          Candidates
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage and view registered candidates.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="py-10 text-center text-gray-500">
            Loading candidates...
          </div>
        }
      >
        <CandidatesList />
      </Suspense>
    </div>
  );
}
