"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ArrowRight, Award, Clock, ChevronRight, User } from "lucide-react";

export type CandidateResultItem = {
  interviewId: string;
  candidateName: string;
  candidateEmail: string;
  status: string;
  overallScore: number | null;
  recommendation: string | null;
  humanReviewStatus: string | null;
  createdAt: string;
};

export default function CandidateResultsTable({
  results,
}: {
  results: CandidateResultItem[];
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return results;
    return results.filter(
      (r) =>
        r.candidateName.toLowerCase().includes(q) ||
        r.candidateEmail.toLowerCase().includes(q)
    );
  }, [results, search]);

  return (
    <div className="space-y-4">
      {/* Search Input Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by candidate name or email..."
          className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 shadow-2xs"
        />
      </div>

      {/* Results Count */}
      <div className="text-xs font-medium text-slate-500">
        Showing <strong className="text-slate-800">{filtered.length}</strong> of{" "}
        <strong className="text-slate-800">{results.length}</strong> candidates
      </div>

      {/* Main Table Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Candidate</th>
                <th className="px-6 py-4">Overall Score</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr
                  key={item.interviewId}
                  className="transition-colors hover:bg-slate-50/70"
                >
                  {/* Candidate Name & Email */}
                  <td className="px-6 py-4.5">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-bold text-xs text-indigo-700 border border-indigo-100">
                        {item.candidateName.slice(0, 2).toUpperCase() || "CA"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {item.candidateName}
                        </p>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {item.candidateEmail || "No email provided"}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Overall Score */}
                  <td className="px-6 py-4.5">
                    {item.overallScore != null ? (
                      <div className="inline-flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          <Award className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-base font-extrabold text-slate-900">
                            {item.overallScore}%
                          </span>
                          {item.recommendation && (
                            <span
                              className={`ml-2 inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold border ${
                                item.recommendation === "Hire"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : item.recommendation === "Hold"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              {item.recommendation}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>Pending</span>
                      </div>
                    )}
                  </td>

                  {/* View Report Button */}
                  <td className="px-6 py-4.5 text-right whitespace-nowrap">
                    <Link
                      href={`/reports/${item.interviewId}`}
                      prefetch={false}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-indigo-600 shadow-2xs transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 active:scale-98"
                    >
                      <span>View Report</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
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
            <p className="font-semibold text-slate-700">
              No matching candidate results
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {search
                ? `No candidates found matching "${search}". Try clearing your search.`
                : "No interview results recorded yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
