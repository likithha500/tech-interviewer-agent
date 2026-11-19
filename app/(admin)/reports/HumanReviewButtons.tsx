
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitHumanReview } from "./actions";

type Decision = "Hire" | "Hold" | "Reject";

type Props = {
    interviewId: string;
    currentDecision: string | null;
};

export function HumanReviewButtons({
    interviewId,
    currentDecision,
}: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleDecision(decision: Decision) {
        const confirmed = window.confirm(
            `Confirm final human decision: ${decision}?`
        );

        if (!confirmed) return;

        setLoading(true);
        setError("");

        try {
            const result = await submitHumanReview(
                interviewId,
                decision
            );

            if (!result.success) {
                setError(result.error ?? "Unable to save decision.");
                return;
            }

            router.refresh();
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    const decisions: Decision[] = ["Hire", "Hold", "Reject"];

    return (
        <div className="flex flex-col gap-2">
            <p className="text-xs text-gray-500">
                Final human decision
            </p>

            <div className="flex flex-wrap gap-1">
                {decisions.map((decision) => (
                    <button
                        key={decision}
                        type="button"
                        disabled={loading}
                        onClick={() => handleDecision(decision)}
                        className={`rounded px-2 py-1 text-xs font-medium disabled:opacity-50 ${currentDecision === decision
                            ? "bg-blue-600 text-white"
                            : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                            }`}
                    >
                        {decision}
                    </button>
                ))}
            </div>

            {error && (
                <p className="text-xs text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}
