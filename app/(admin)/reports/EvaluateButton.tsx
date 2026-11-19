"use client";

import { useState, useTransition } from "react";
import { triggerEvaluation } from "./actions";
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export function EvaluateButton({ interviewId }: { interviewId: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await triggerEvaluation(interviewId);
      if (result.success) {
        setMessage({ type: "success", text: "Evaluation complete." });
      } else {
        setMessage({
          type: "error",
          text: result.error ?? "Evaluation failed.",
        });
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Evaluating…</span>
          </>
        ) : (
          <>
            <Sparkles className="h-3 w-3" />
            <span>Run AI Eval</span>
          </>
        )}
      </button>

      {message && (
        <span
          className={`flex items-center gap-1 text-[11px] font-medium ${
            message.type === "success" ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertCircle className="h-3 w-3" />
          )}
          {message.text}
        </span>
      )}
    </div>
  );
}
