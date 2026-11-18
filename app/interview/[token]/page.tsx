
import { Suspense } from "react";
import { connection } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import AnswerForm from "./AnswerForm";

const ROUND_CATEGORIES = [
    "DSA",
    "DBMS",
    "OS",
    "Networks",
    "OOP",
] as const;

type RoundCategory = (typeof ROUND_CATEGORIES)[number];

interface CandidateInterview {
    interview_id: string;
    candidate_name: string;
    status: string;
    scheduled_at: string | null;
}

interface InterviewQuestion {
    interview_id: string;
    candidate_name: string;
    question_id: string;
    category: string;
    topic: string;
    difficulty: string;
    question: string;
    marks: number;
}

interface RoundProgress {
    category: string;
    total: number;
    answered: number;
    easy_total: number;
    easy_answered: number;
    medium_total: number;
    medium_answered: number;
    hard_total: number;
    hard_answered: number;
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

    // Find the first round that still has unanswered questions.
    for (const category of ROUND_CATEGORIES) {
        const { data: questionData, error: questionError } =
            await supabase.rpc(
                "get_candidate_round_question",
                {
                    p_token_hash: tokenHash,
                    p_category: category,
                }
            );

        if (questionError) {
            console.error(
                `Question loading failed for ${category}:`,
                questionError.message
            );

            return (
                <MessageScreen
                    title="Unable to load your interview"
                    message="Please refresh the page or contact your interviewer."
                />
            );
        }

        // No unanswered question in this category.
        // Continue to the next round.
        if (!questionData) {
            continue;
        }

        const { data: progressData, error: progressError } =
            await supabase.rpc(
                "get_candidate_round_progress",
                {
                    p_token_hash: tokenHash,
                    p_category: category,
                }
            );

        if (progressError || !progressData) {
            return (
                <MessageScreen
                    title="Unable to load interview progress"
                    message="Please refresh the page or contact your interviewer."
                />
            );
        }

        const question =
            questionData as unknown as InterviewQuestion;

        const progress =
            progressData as unknown as RoundProgress;

        return (
            <RoundQuestionScreen
                question={question}
                progress={progress}
                token={token}
                category={category}
            />
        );
    }

    return <AllRoundsCompletedScreen />;
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
                                ? new Date(
                                    interview.scheduled_at
                                ).toLocaleString("en-IN", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                    timeZone: "Asia/Kolkata",
                                })
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
                        <li>Use a laptop or desktop for the interview.</li>
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

function RoundQuestionScreen({
    question,
    progress,
    token,
    category,
}: {
    question: InterviewQuestion;
    progress: RoundProgress;
    token: string;
    category: RoundCategory;
}) {
    const percentage =
        progress.total > 0
            ? Math.round(
                (progress.answered / progress.total) * 100
            )
            : 0;

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
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                {category} Round Progress
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                {progress.answered} of {progress.total} questions completed
                            </p>
                        </div>

                        <span className="text-lg font-bold text-blue-600">
                            {percentage}%
                        </span>
                    </div>

                    <div
                        className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100"
                        role="progressbar"
                        aria-valuenow={percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${category} round progress`}
                    >
                        <div
                            className="h-full rounded-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <DifficultyProgress
                            label="Easy"
                            answered={progress.easy_answered}
                            total={progress.easy_total}
                            color="bg-green-500"
                        />

                        <DifficultyProgress
                            label="Medium"
                            answered={progress.medium_answered}
                            total={progress.medium_total}
                            color="bg-amber-500"
                        />

                        <DifficultyProgress
                            label="Hard"
                            answered={progress.hard_answered}
                            total={progress.hard_total}
                            color="bg-red-500"
                        />
                    </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-5">
                        <div>
                            <p className="text-sm text-gray-500">
                                {question.category} / {question.topic}
                            </p>

                            <h2 className="mt-1 text-lg font-semibold text-gray-900">
                                {category} Round
                            </h2>
                        </div>

                        <div className="flex items-center gap-3">
                            <DifficultyBadge
                                difficulty={question.difficulty}
                            />

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
                            Read the question carefully and explain your
                            reasoning clearly.
                        </p>
                    </div>

                    <AnswerForm
                        token={token}
                        questionId={question.question_id}
                        category={category}
                    />
                </section>

                <p className="text-center text-xs text-gray-400">
                    Powered by Tech Interviewer Agent
                </p>
            </div>
        </main>
    );
}

function DifficultyProgress({
    label,
    answered,
    total,
    color,
}: {
    label: string;
    answered: number;
    total: number;
    color: string;
}) {
    const percentage =
        total > 0
            ? Math.round((answered / total) * 100)
            : 0;

    return (
        <div className="rounded-lg border border-gray-100 p-4">
            <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-gray-700">
                    {label}
                </span>

                <span className="text-xs font-medium text-gray-500">
                    {answered}/{total}
                </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                    className={`h-full rounded-full ${color} transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

function AllRoundsCompletedScreen() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
            <section className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700">
                    ✓
                </div>

                <h1 className="mt-5 text-2xl font-bold text-gray-900">
                    Technical Interview Completed
                </h1>

                <p className="mt-3 text-gray-500">
                    Congratulations! You have completed all available
                    technical interview questions.
                </p>

                <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-5">
                    <p className="text-sm font-semibold text-gray-800">
                        All technical rounds completed
                    </p>

                    <p className="mt-2 text-sm text-gray-500">
                        DSA · DBMS · OS · Networks · OOP
                    </p>
                </div>

                <p className="mt-6 text-sm text-gray-600">
                    Please wait for your interviewer for the next steps.
                </p>
            </section>
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

function DifficultyBadge({
    difficulty,
}: {
    difficulty: string;
}) {
    const styles: Record<string, string> = {
        Easy: "bg-green-100 text-green-700",
        Medium: "bg-amber-100 text-amber-700",
        Hard: "bg-red-100 text-red-700",
    };

    return (
        <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[difficulty] ??
                "bg-gray-100 text-gray-700"
                }`}
        >
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

                <p className="mt-3 text-sm text-gray-500">
                    {message}
                </p>
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
