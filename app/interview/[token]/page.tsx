
import { Suspense } from "react";
import { connection } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import AnswerForm from "./AnswerForm";

interface CandidateInterview {
    interview_id: string;
    candidate_name: string;
    status: string;
    scheduled_at: string | null;
}

interface DSAQuestion {
    interview_id: string;
    candidate_name: string;
    question_id: string;
    category: string;
    topic: string;
    difficulty: string;
    question: string;
    marks: number;
}

async function InterviewContent({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    await connection();

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
        { p_token_hash: tokenHash }
    );

    if (error || !data) {
        return <AccessDenied />;
    }

    const interview = data as unknown as CandidateInterview;

    if (interview.status !== "In Progress") {
        return <WelcomeScreen interview={interview} />;
    }

    const { data: questionData, error: questionError } =
        await supabase.rpc(
            "get_candidate_dsa_question",
            { p_token_hash: tokenHash }
        );

    if (questionError) {
        return (
            <MessageScreen
                title="Unable to load your question"
                message="Please contact your interviewer for assistance."
            />
        );
    }

    if (!questionData) {
        return (
            <MessageScreen
                title="DSA Round Completed"
                message="You have answered all currently available DSA questions. Please wait for your interviewer."
            />
        );
    }

    const question = questionData as unknown as DSAQuestion;

    return (
        <DSAQuestionScreen
            question={question}
            token={token}
        />
    );
}

function WelcomeScreen({
    interview,
}: {
    interview: CandidateInterview;
}) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
            <section className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                    Tech Interviewer Agent
                </p>

                <h1 className="mt-3 text-3xl font-bold text-gray-900">
                    Welcome, {interview.candidate_name}
                </h1>

                <p className="mt-2 text-gray-500">
                    Your technical interview details are available below.
                </p>

                <div className="mt-8 space-y-4 rounded-xl bg-gray-50 p-5">
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-gray-500">
                            Interview status
                        </span>
                        <StatusBadge status={interview.status} />
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

                    <p className="mt-4 text-sm font-medium text-blue-700">
                        {interview.status === "Scheduled"
                            ? "Your interviewer will start the interview when you are ready."
                            : "Your interview is not currently active."}
                    </p>
                </div>

                <p className="mt-8 text-center text-xs text-gray-400">
                    Powered by Tech Interviewer Agent
                </p>
            </section>
        </main>
    );
}

function DSAQuestionScreen({
    question,
    token,
}: {
    question: DSAQuestion;
    token: string;
}) {
    return (
        <main className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="mx-auto max-w-4xl space-y-6">
                <header className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                            Tech Interviewer Agent
                        </p>
                        <h1 className="mt-1 text-2xl font-bold text-gray-900">
                            Technical Interview
                        </h1>
                    </div>

                    <StatusBadge status="In Progress" />
                </header>

                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-5">
                        <div>
                            <p className="text-sm text-gray-500">
                                {question.category} / {question.topic}
                            </p>
                            <h2 className="mt-1 text-lg font-semibold text-gray-900">
                                DSA Round
                            </h2>
                        </div>

                        <div className="flex items-center gap-3">
                            <DifficultyBadge difficulty={question.difficulty} />
                            <span className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700">
                                {question.marks} marks
                            </span>
                        </div>
                    </div>

                    <div className="py-8">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                            Question
                        </p>

                        <div className="whitespace-pre-wrap text-base leading-8 text-gray-800">
                            {question.question}
                        </div>
                    </div>

                    <div className="mb-8 rounded-lg border border-blue-100 bg-blue-50 p-4">
                        <p className="text-sm font-medium text-blue-800">
                            Take your time to understand the problem and
                            explain your approach clearly.
                        </p>
                    </div>

                    <AnswerForm
                        token={token}
                        questionId={question.question_id}
                    />
                </section>

                <p className="text-center text-xs text-gray-400">
                    Powered by Tech Interviewer Agent
                </p>
            </div>
        </main>
    );
}

function StatusBadge({ status }: { status: string }) {
    return (
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            {status}
        </span>
    );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
    const styles: Record<string, string> = {
        Easy: "bg-green-100 text-green-700",
        Medium: "bg-amber-100 text-amber-700",
        Hard: "bg-red-100 text-red-700",
    };

    return (
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[difficulty] ?? "bg-gray-100 text-gray-700"
            }`}>
            {difficulty}
        </span>
    );
}

function MessageScreen({
    title,
    message,
}: {
    title: string;
    message: string;
}) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                <h1 className="text-xl font-semibold text-gray-900">
                    {title}
                </h1>
                <p className="mt-3 text-sm text-gray-500">{message}</p>
            </div>
        </main>
    );
}

function AccessDenied() {
    return (
        <MessageScreen
            title="Invalid or expired interview link"
            message="This interview link is invalid or has been replaced. Please contact your interviewer."
        />
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
                        Loading interview...
                    </p>
                </main>
            }
        >
            <InterviewContent params={params} />
        </Suspense>
    );
}
