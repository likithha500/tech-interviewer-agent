"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Layers,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";

export type DemoATSRecord = {
  id: string;
  interview_id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string | null;
  overall_score: number;
  skill_scores: Array<{
    skill: string;
    score: number | null;
    maxScore: number | null;
    feedback?: string | null;
  }>;
  strengths: string[];
  weaknesses: string[];
  ai_recommendation: "Hire" | "Hold" | "Reject";
  final_human_decision: "Hire" | "Hold" | "Reject";
  evaluation_feedback: string | null;
  received_at: string;
};

export default function DemoATSTable({ records }: { records: DemoATSRecord[] }) {
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<DemoATSRecord | null>(null);

  const filtered = records.filter(
    (r) =>
      r.candidate_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.candidate_email && r.candidate_email.toLowerCase().includes(search.toLowerCase())) ||
      r.interview_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search Input Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search received candidate, email, or interview ID..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 shadow-2xs"
          />
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Showing <strong className="text-slate-800">{filtered.length}</strong> of{" "}
          <strong className="text-slate-800">{records.length}</strong> synced records
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Candidate</th>
                <th className="px-6 py-4">Overall Score</th>
                <th className="px-6 py-4">AI Advisory</th>
                <th className="px-6 py-4">Final Decision</th>
                <th className="px-6 py-4">Received Timestamp</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-slate-50/70">
                  {/* Candidate */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-bold text-xs text-indigo-700 border border-indigo-100">
                        {item.candidate_name.slice(0, 2).toUpperCase() || "CA"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {item.candidate_name}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {item.candidate_email || "—"}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400">
                          Interview: {item.interview_id.slice(0, 8)}…
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Overall Score */}
                  <td className="px-6 py-4 font-bold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-indigo-600" />
                      <span>{item.overall_score}%</span>
                    </div>
                  </td>

                  {/* AI Recommendation */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                        item.ai_recommendation === "Hire"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : item.ai_recommendation === "Hold"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {item.ai_recommendation}
                    </span>
                  </td>

                  {/* Final Human Decision */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-extrabold ${
                        item.final_human_decision === "Hire"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : item.final_human_decision === "Hold"
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-rose-600 text-white border-rose-600"
                      }`}
                    >
                      {item.final_human_decision}
                    </span>
                  </td>

                  {/* Timestamp */}
                  <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(item.received_at))}</span>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setSelectedRecord(item)}
                      className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-indigo-600 shadow-2xs hover:bg-slate-50 hover:border-slate-300"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
              <Search className="h-5 w-5" />
            </div>
            <p className="font-semibold text-slate-700">No Demo ATS records found</p>
            <p className="mt-1 text-xs text-slate-400">
              {search
                ? `No candidate reports matching "${search}".`
                : "No interview scorecards have been pushed to Demo ATS yet. Go to any completed interview report and click 'Push Report to Demo ATS'."}
            </p>
          </div>
        )}
      </div>

      {/* Detailed Scorecard Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                  Demo ATS — Received Scorecard
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  {selectedRecord.candidate_name}
                </h3>
                <p className="text-xs text-slate-400">{selectedRecord.candidate_email || "No email"}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Score & Decision Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <span className="text-xs font-semibold text-slate-500">Overall Score</span>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {selectedRecord.overall_score}%
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <span className="text-xs font-semibold text-slate-500">AI Recommendation</span>
                <p className="text-base font-bold text-indigo-600 mt-1">
                  {selectedRecord.ai_recommendation} (Advisory)
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <span className="text-xs font-semibold text-slate-500">Final Human Decision</span>
                <p className="text-base font-bold text-emerald-700 mt-1">
                  {selectedRecord.final_human_decision}
                </p>
              </div>
            </div>

            {/* Skill Scores */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Skill Breakdown Received
              </h4>
              <div className="space-y-2">
                {selectedRecord.skill_scores && selectedRecord.skill_scores.length > 0 ? (
                  selectedRecord.skill_scores.map((s, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-800">{s.skill}</span>
                        {s.feedback && (
                          <p className="text-slate-500 text-[11px] mt-0.5 italic">{s.feedback}</p>
                        )}
                      </div>
                      <span className="font-mono font-bold text-slate-700">
                        {s.score ?? 0} / {s.maxScore ?? 10}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No specific skill entries.</p>
                )}
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 space-y-1">
                <span className="font-bold text-emerald-900 block">Demonstrated Strengths</span>
                {selectedRecord.strengths?.length > 0 ? (
                  selectedRecord.strengths.map((st, i) => (
                    <p key={i} className="text-emerald-800">✓ {st}</p>
                  ))
                ) : (
                  <p className="text-slate-400 italic">None logged.</p>
                )}
              </div>

              <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3.5 space-y-1">
                <span className="font-bold text-rose-900 block">Areas for Improvement</span>
                {selectedRecord.weaknesses?.length > 0 ? (
                  selectedRecord.weaknesses.map((wk, i) => (
                    <p key={i} className="text-rose-800">✗ {wk}</p>
                  ))
                ) : (
                  <p className="text-slate-400 italic">None logged.</p>
                )}
              </div>
            </div>

            {/* Audit Details */}
            <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-400 flex flex-wrap justify-between gap-2">
              <span>Demo Record ID: <strong className="font-mono text-slate-600">{selectedRecord.id}</strong></span>
              <span>Received: {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(selectedRecord.received_at))}</span>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-2">
              <Link
                href={`/reports/${selectedRecord.interview_id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
              >
                <span>View Original Assessment Report</span>
                <ExternalLink className="h-3 w-3" />
              </Link>

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-semibold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
