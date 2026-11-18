
import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import CandidateLinkButton from "./CandidateLinkButton";

interface Interview {
    id: string;
    status: string;
    scheduled_at: string | null;
    candidates: {
        name: string;
        email: string;
    } | null;
}

async function CandidateAccessList() {
    await connection();

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("interviews")
        .select(`
            id,
            status,
            scheduled_at,
            candidates (
                name,
                email
            )
        `)
        .order("created_at", { ascending: false });

    const interviews = (data ?? []) as unknown as Interview[];

    return (
        <div className="space-y-6">
            {error && (
                <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
                    Could not load interviews: {error.message}
                </p>
            )}

            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-6 py-4 font-medium">Candidate</th>
                            <th className="px-6 py-4 font-medium">Email</th>
                            <th className="px-6 py-4 font-medium">Interview Status</th>
                            <th className="px-6 py-4 font-medium">Access Link</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                        {interviews.map((interview) => (
                            <tr key={interview.id}>
                                <td className="px-6 py-4 font-medium text-gray-900">
                                    {interview.candidates?.name ?? "Unknown"}
                                </td>

                                <td className="px-6 py-4 text-gray-600">
                                    {interview.candidates?.email ?? "—"}
                                </td>

                                <td className="px-6 py-4">
                                    {interview.status}
                                </td>

                                <td className="px-6 py-4">
                                    <CandidateLinkButton
                                        interviewId={interview.id}
                                    />
                                </td>
                            </tr>
                        ))}

                        {interviews.length === 0 && !error && (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-6 py-12 text-center text-gray-500"
                                >
                                    No interviews found. Schedule an interview first.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <p className="text-xs text-gray-500">
                Generating a new link replaces the previous link for that interview.
                Share links only with the intended candidate.
            </p>
        </div>
    );
}

export default function CandidateAccessPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                    Candidate Access
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    Generate secure interview links for scheduled candidates.
                </p>
            </div>

            <Suspense
                fallback={
                    <p className="text-sm text-gray-500">
                        Loading candidate interviews...
                    </p>
                }
            >
                <CandidateAccessList />
            </Suspense>
        </div>
    );
}
