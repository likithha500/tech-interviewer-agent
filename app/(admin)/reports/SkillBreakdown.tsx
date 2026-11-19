"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, Quote } from "lucide-react";

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
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-600 shadow-2xs transition hover:bg-slate-50 hover:text-indigo-700"
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        <span>{open ? "Hide Details" : "View Skills"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3 rounded-xl border border-slate-200/90 bg-slate-50/80 p-3.5 shadow-xs">
          {skills.map((s) => {
            const pct =
              s.max_score && s.max_score > 0
                ? Math.round(((s.score ?? 0) / s.max_score) * 100)
                : null;

            return (
              <div key={s.skill} className="space-y-1.5 border-b border-slate-200/50 pb-2.5 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    {s.skill}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    {s.score ?? "?"}/{s.max_score ?? "?"}{" "}
                    {pct != null && (
                      <span className={`ml-1 font-bold ${
                        pct >= 70 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600"
                      }`}>
                        ({pct}%)
                      </span>
                    )}
                  </span>
                </div>

                {/* Score progress bar */}
                {pct != null && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        pct >= 70
                          ? "bg-emerald-500"
                          : pct >= 50
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}

                {s.feedback && (
                  <p className="text-[11px] text-slate-500 italic leading-snug">
                    {s.feedback.slice(0, 180)}
                  </p>
                )}

                {/* Per-question evidence dropdown */}
                {Array.isArray(s.evidence) && s.evidence.length > 0 && (
                  <details className="mt-1 group">
                    <summary className="cursor-pointer text-[11px] font-semibold text-indigo-600 hover:text-indigo-800">
                      {s.evidence.length} question(s) assessed
                    </summary>
                    <div className="mt-2 space-y-2">
                      {s.evidence.map((item) => (
                        <div
                          key={item.questionId}
                          className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs shadow-2xs space-y-1"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-slate-900 line-clamp-1">
                              {typeof item.question === "string"
                                ? item.question.slice(0, 100)
                                : "Question assessment"}
                            </p>
                            <span className="shrink-0 font-bold text-slate-700">
                              {item.score}/{item.maxScore}
                            </span>
                          </div>

                          {item.feedback && (
                            <p className="text-[11px] text-slate-600 italic">
                              {item.feedback}
                            </p>
                          )}

                          {item.matched_key_points.length > 0 && (
                            <div className="flex items-start gap-1 text-[11px] text-emerald-700">
                              <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5 text-emerald-600" />
                              <span>{item.matched_key_points.join(", ")}</span>
                            </div>
                          )}

                          {item.missing_key_points.length > 0 && (
                            <div className="flex items-start gap-1 text-[11px] text-rose-700">
                              <XCircle className="h-3 w-3 shrink-0 mt-0.5 text-rose-600" />
                              <span>{item.missing_key_points.join(", ")}</span>
                            </div>
                          )}

                          {item.quotes.length > 0 && (
                            <div className="mt-1 space-y-0.5 rounded bg-slate-50 p-1.5 border border-slate-100">
                              {item.quotes.map((q, i) => (
                                <p key={i} className="flex items-start gap-1 text-[11px] text-slate-500 font-mono italic">
                                  <Quote className="h-2.5 w-2.5 shrink-0 text-slate-400 mt-0.5" />
                                  <span>&ldquo;{q}&rdquo;</span>
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
