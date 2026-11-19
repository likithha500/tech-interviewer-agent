"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitHumanReview } from "./actions";
import { Check, Clock, X, AlertCircle } from "lucide-react";

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

    const decisions: { name: Decision; icon: typeof Check; activeClass: string }[] = [
        { name: "Hire", icon: Check, activeClass: "bg-emerald-600 text-white border-emerald-600 shadow-xs" },
        { name: "Hold", icon: Clock, activeClass: "bg-amber-600 text-white border-amber-600 shadow-xs" },
        { name: "Reject", icon: X, activeClass: "bg-rose-600 text-white border-rose-600 shadow-xs" },
    ];

    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Action Decision
            </span>

            <div className="flex flex-wrap gap-1">
                {decisions.map((item) => {
                    const isSelected = currentDecision === item.name;
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.name}
                            type="button"
                            disabled={loading}
                            onClick={() => handleDecision(item.name)}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                                isSelected
                                    ? item.activeClass
                                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                            }`}
                        >
                            <Icon className="h-3 w-3" />
                            {item.name}
                        </button>
                    );
                })}
            </div>

            {error && (
                <div className="flex items-center gap-1 text-[11px] text-rose-600">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}
