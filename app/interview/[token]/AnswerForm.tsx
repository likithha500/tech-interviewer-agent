"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitRoundAnswer } from "./actions";
import { Send, AlertCircle } from "lucide-react";

type RoundCategory =
    | "DSA"
    | "Core CS";

export default function AnswerForm({
    token,
    questionId,
    category,
}: {
    token: string;
    questionId: string;
    category: RoundCategory;
}) {
    const router = useRouter();

    const [answer, setAnswer] = useState("");
    const [error, setError] = useState("");
    const [isPending, startTransition] = useTransition();

    function handleSubmit(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();
        setError("");

        if (!answer.trim()) {
            setError("Please enter your answer before submitting.");
            return;
        }

        startTransition(async () => {
            const result = await submitRoundAnswer(
                token,
                category,
                questionId,
                answer
            );

            if (!result.success) {
                setError(result.error ?? "Submission failed.");
                return;
            }

            setAnswer("");

            // Refresh the server-rendered question and progress.
            router.refresh();
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <div className="mb-2 flex items-center justify-between">
                    <label
                        htmlFor="candidateAnswer"
                        className="text-xs font-bold uppercase tracking-wider text-slate-700"
                    >
                        Your Technical Explanation
                    </label>

                    <span className="text-xs font-mono text-slate-400">
                        {answer.length}/20,000 characters
                    </span>
                </div>

                <textarea
                    id="candidateAnswer"
                    value={answer}
                    onChange={(event) =>
                        setAnswer(event.target.value)
                    }
                    maxLength={20000}
                    rows={10}
                    disabled={isPending}
                    placeholder="Provide your technical explanation, algorithm breakdown, edge case handling, and complexity analysis..."
                    className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/50 p-4 font-mono text-sm leading-relaxed text-slate-900 outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-3 focus:ring-indigo-100 disabled:bg-slate-100"
                />
            </div>

            {error && (
                <div
                    role="alert"
                    className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-800"
                >
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{error}</span>
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-xs text-slate-400">
                    Your response will be evaluated using Groq AI for technical correctness, clarity, and key concepts.
                </p>

                <button
                    type="submit"
                    disabled={isPending || !answer.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-100 transition hover:bg-indigo-700 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Send className="h-4 w-4" />
                    {isPending ? "Submitting..." : "Submit Answer"}
                </button>
            </div>
        </form>
    );
}
