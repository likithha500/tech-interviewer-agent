
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitRoundAnswer } from "./actions";

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
                        className="text-sm font-semibold text-gray-900"
                    >
                        Your Answer
                    </label>

                    <span className="text-xs text-gray-400">
                        {answer.length}/20000
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
                    placeholder="Explain your approach, reasoning, and answer here..."
                    className="w-full resize-y rounded-xl border border-gray-300 bg-white p-4 font-mono text-sm leading-6 text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
                />
            </div>

            {error && (
                <p
                    role="alert"
                    className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                >
                    {error}
                </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-gray-400">
                    Your submitted answer will be saved for evaluation.
                </p>

                <button
                    type="submit"
                    disabled={isPending || !answer.trim()}
                    className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isPending ? "Submitting..." : "Submit Answer"}
                </button>
            </div>
        </form>
    );
}

