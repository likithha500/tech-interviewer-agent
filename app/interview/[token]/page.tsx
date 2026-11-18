
import { Suspense } from "react";
import { connection } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

interface CandidateInterview {
    interview_id: string;
    candidate_name: string;
    status: string;
    scheduled_at: string | null;
}

async function InterviewContent({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    await connection();

    // Access dynamic route parameters inside Suspense.
    const { token } = await params;

    if (!/^[a-f0-9]{64}$/i.test(token)) {
        return <AccessDenied />;
    }

    const tokenHash = createHash("sha256")
        .update(token)
        .digest("hex");

    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
        "get_candidate_interview",
        {
            p_token_hash: tokenHash,
        }
    );

    if (error || !data) {
        return <AccessDenied />;
    }

    const interview = data as unknown as CandidateInterview;

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
            <section className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <div className="mb-8">
                    <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                        Tech Interviewer Agent
                    </p>

                    <h1 className="mt-3 text-3xl font-bold text-gray-900">
                        Welcome, {interview.candidate_name}
                    </h1>

                    <p className="mt-2 text-gray-500">
                        Your technical interview details are available below.
                    </p>
                </div>

                <div className="space-y-4 rounded-xl bg-gray-50 p-5">
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-gray-500">
                            Interview status
                        </span>

                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                            {interview.status}
                        </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-gray-500">
                            Scheduled date
                        </span>

                        <span className="text-right text-sm font-medium text-gray-900">
                            {interview.scheduled_at
                                ? new Date(interview.scheduled_at).toLocaleString(
                                    "en-IN",
                                    {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                        timeZone: "Asia/Kolkata",
                                    }
                                )
                                : "To be announced"}
                        </span>
                    </div>
                </div>

                <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-5">
                    <h2 className="font-semibold text-gray-900">
                        Interview Instructions
                    </h2>

                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-600">
                        <li>Ensure you have a stable internet connection.</li>
                        <li>Use a laptop or desktop for the coding round.</li>
                        <li>Read each question carefully before answering.</li>
                        <li>Explain your approach and reasoning clearly.</li>
                    </ul>
                </div>

                <div className="mt-8 border-t border-gray-100 pt-5">
                    <p className="text-center text-xs text-gray-400">
                        Powered by Tech Interviewer Agent
                    </p>
                </div>
            </section>
        </main>
    );
}

function AccessDenied() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                <div className="text-4xl">🔒</div>

                <h1 className="mt-4 text-xl font-semibold text-gray-900">
                    Invalid or expired interview link
                </h1>

                <p className="mt-2 text-sm text-gray-500">
                    This interview link is invalid or has been replaced.
                    Please contact your interviewer for assistance.
                </p>
            </div>
        </main>
    );
}

export default function CandidateInterviewPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    return (
        <Suspense
            fallback={
                <main className="flex min-h-screen items-center justify-center bg-gray-50">
                    <p className="text-sm text-gray-500">
                        Validating interview access...
                    </p>
                </main>
            }
        >
            <InterviewContent params={params} />
        </Suspense>
    );
}
