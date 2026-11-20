
import { Suspense } from "react";
import { connection } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import AnswerForm from "./AnswerForm";
import CodeEditor from "./CodeEditor";
import {
  Code2,
  Terminal,
  CheckCircle2,
  Clock,
  BookOpen,
  HelpCircle,
  Shield,
  Bot,
  AlertCircle,
} from "lucide-react";

const ROUND_CATEGORIES = [
    "DSA",
    "Core CS",
    "Coding",
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
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
            <section className="w-full max-w-2xl rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xs">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                        <Bot className="h-3.5 w-3.5" />
                        AI Assessment Session
                    </span>
                </div>

                <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">
                    Welcome, {interview.candidate_name}
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                    Your technical candidate portal is active. Please review session prerequisites below.
                </p>

                <div className="mt-6 space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-5">
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Interview Status
                        </span>
                        <StatusBadge status={interview.status} />
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200/60">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Scheduled Date
                        </span>

                        <span className="text-right text-xs font-semibold text-slate-800">
                            {interview.scheduled_at
                                ? new Intl.DateTimeFormat("en-GB", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      timeZone: "Asia/Kolkata",
                                  }).format(new Date(interview.scheduled_at))
                                : "To be announced"}
                        </span>
                    </div>
                </div>

                <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/60 p-5">
                    <h2 className="text-sm font-bold text-indigo-950">
                        Interview Assessment Instructions
                    </h2>

                    <ul className="mt-3 list-disc space-y-2 pl-5 text-xs text-indigo-900/80 leading-relaxed">
                        <li>Ensure a stable connection; answers are auto-saved on submit.</li>
                        <li>This interview includes DSA theory, Core CS concepts, and interactive Coding.</li>
                        <li>In the coding round, your solution will be compiled in a restricted Docker container against automated test cases.</li>
                        <li>Explain your reasoning and time/space complexity tradeoffs clearly.</li>
                    </ul>

                    <p className="mt-4 text-xs font-semibold text-indigo-700">
                        {interview.status === "Scheduled"
                            ? "Your interviewer will start this session when ready. Keep this tab open."
                            : "Your interview is currently inactive."}
                    </p>
                </div>

                <p className="mt-8 text-center text-xs text-slate-400">
                    Powered by AutoRecruit AI Assessment Engine
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
        <main className="min-h-screen bg-slate-50/60 px-4 py-8">
            <div className="mx-auto max-w-5xl space-y-6">
                {/* Header */}
                <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                            <Bot className="h-5 w-5" />
                        </div>
                        <div>
                            <span className="block text-xs font-bold uppercase tracking-wider text-indigo-600">
                                AutoRecruit Technical Assessment
                            </span>
                            <h1 className="text-xl font-extrabold text-slate-900">
                                {category} Round
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                            <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                            Live Session
                        </span>
                    </div>
                </header>

                {/* Progress Card */}
                <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-bold text-slate-900">
                                Round Progress &amp; Coverage
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-400">
                                {progress.answered} of {progress.total} questions answered in this section
                            </p>
                        </div>

                        <span className="text-xl font-extrabold text-indigo-600">
                            {percentage}%
                        </span>
                    </div>

                    <div
                        className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100"
                        role="progressbar"
                        aria-valuenow={percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${category} round progress`}
                    >
                        <div
                            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <DifficultyProgress
                            label="Easy"
                            answered={progress.easy_answered}
                            total={progress.easy_total}
                            color="bg-emerald-500"
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
                            color="bg-rose-500"
                        />
                    </div>
                </section>

                {/* Question Assessment Card */}
                <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Topic: {question.category} / {question.topic}
                            </span>
                            <h2 className="mt-1 text-lg font-bold text-slate-900">
                                Current Problem
                            </h2>
                        </div>

                        <div className="flex items-center gap-2">
                            <DifficultyBadge difficulty={question.difficulty} />
                            <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                                {question.marks} marks
                            </span>
                        </div>
                    </div>

                    {/* Question Content Box */}
                    <div className="my-6 rounded-xl border border-slate-100 bg-slate-50/70 p-5">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Question Specification
                        </p>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 font-medium">
                            {question.question}
                        </div>
                    </div>

                    {category === "Coding" ? (
                        <CodeEditor
                            token={token}
                            questionId={question.question_id}
                        />
                    ) : (
                        <AnswerForm
                            token={token}
                            questionId={question.question_id}
                            category={category}
                        />
                    )}
                </section>

                <p className="text-center text-xs text-slate-400">
                    AutoRecruit Agent · Secure Sandboxed Assessment Environment
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
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700">
                    {label}
                </span>

                <span className="text-xs font-semibold text-slate-500">
                    {answered}/{total}
                </span>
            </div>

            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
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
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
            <section className="w-full max-w-xl rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-xs">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-xs">
                    <CheckCircle2 className="h-8 w-8" />
                </div>

                <h1 className="mt-5 text-2xl font-extrabold text-slate-900">
                    Technical Assessment Completed
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                    Great work! You have successfully submitted all questions across the interview rounds.
                </p>

                <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Rounds Evaluated
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                        DSA · Core CS · Python Coding
                    </p>
                </div>

                <p className="mt-6 text-xs text-slate-400">
                    Your answers and code executions have been logged for automated evaluation and hiring panel review.
                </p>
            </section>
        </main>
    );
}

function StatusBadge({ status }: { status: string }) {
    return (
        <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
            {status}
        </span>
    );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
    const styles: Record<string, string> = {
        Easy: "bg-emerald-50 text-emerald-700 border-emerald-200",
        Medium: "bg-amber-50 text-amber-700 border-amber-200",
        Hard: "bg-rose-50 text-rose-700 border-rose-200",
    };

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                styles[difficulty] ?? "bg-slate-100 text-slate-700 border-slate-200"
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
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
            <div className="max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-xs">
                <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
                <h1 className="mt-4 text-lg font-bold text-slate-900">
                    {title}
                </h1>
                <p className="mt-2 text-xs text-slate-500">
                    {message}
                </p>
            </div>
        </main>
    );
}

function AccessDenied() {
    return (
        <MessageScreen
            title="Invalid or Expired Link"
            message="This interview token is invalid or has expired. Please verify your link with the recruitment coordinator."
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
                <main className="flex min-h-screen items-center justify-center bg-slate-50">
                    <p className="text-sm font-semibold text-slate-500">
                        Loading assessment environment...
                    </p>
                </main>
            }
        >
            <InterviewContent params={params} />
        </Suspense>
    );
}
