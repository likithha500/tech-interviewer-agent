"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type EvidenceItem = {
  questionId: string;
  question: string;
  score: number;
  maxScore: number;
  feedback: string;
  matched_key_points: string[];
  missing_key_points: string[];
  quotes: string[];
};

type SkillRow = {
  skill: string;
  score: number | null;
  max_score: number | null;
  feedback: string | null;
  evidence: EvidenceItem[] | null;
};

export function SkillBreakdown({ skills }: { skills: SkillRow[] }) {
  const [open, setOpen] = useState(false);

  if (!skills || skills.length === 0) return null;

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {open ? "Hide" : "Show"} skill breakdown
      </button>

      {open && (
        <div className="mt-2 space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
          {skills.map((s) => {
            const pct =
              s.max_score && s.max_score > 0
                ? Math.round(((s.score ?? 0) / s.max_score) * 100)
                : null;

            return (
              <div key={s.skill} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-800">
                    {s.skill}
                  </span>
                  <span className="text-xs text-gray-500">
                    {s.score ?? "?"}/{s.max_score ?? "?"}{" "}
                    {pct != null && `(${pct}%)`}
                  </span>
                </div>

                {/* Score bar */}
                {pct != null && (
                  <div className="h-1.5 w-full rounded-full bg-gray-200">
                    <div
                      className={`h-1.5 rounded-full ${pct >= 70
                          ? "bg-green-500"
                          : pct >= 50
                            ? "bg-amber-400"
                            : "bg-red-400"
                        }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}

                {s.feedback && (
                  <p className="text-xs text-gray-600 italic">{s.feedback.slice(0, 200)}</p>
                )}

                {/* Per-question evidence */}
                {Array.isArray(s.evidence) && s.evidence.length > 0 && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-gray-500">
                      {s.evidence.length} question(s) evaluated
                    </summary>
                    <div className="mt-1 space-y-2">
                      {s.evidence.map((item) => (
                        <div
                          key={item.questionId}
                          className="rounded border border-gray-200 bg-white p-2 text-xs"
                        >
                          <p className="font-medium text-gray-700">
                            {typeof item.question === "string"
                              ? item.question.slice(0, 100)
                              : "Question details unavailable"}
                          </p>
                          <p className="text-gray-500">
                            Score: {item.score}/{item.maxScore}
                          </p>
                          {item.feedback && (
                            <p className="text-gray-600 italic">
                              {item.feedback}
                            </p>
                          )}
                          {item.matched_key_points.length > 0 && (
                            <p className="text-green-700">
                              ✓ {item.matched_key_points.join(", ")}
                            </p>
                          )}
                          {item.missing_key_points.length > 0 && (
                            <p className="text-red-700">
                              ✗ {item.missing_key_points.join(", ")}
                            </p>
                          )}
                          {item.quotes.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {item.quotes.map((q, i) => (
                                <p key={i} className="text-gray-500">
                                  &ldquo;{q}&rdquo;
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
