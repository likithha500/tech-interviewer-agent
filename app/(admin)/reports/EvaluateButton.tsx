"use client";

import { useState, useTransition } from "react";
import { triggerEvaluation } from "./actions";

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
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Evaluating…" : "Evaluate"}
      </button>
      {message && (
        <span
          className={`text-xs ${
            message.type === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message.text}
        </span>
      )}
    </div>
  );
}
