"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ATSProviderType,
  ATSConfigStatus,
  ATSCandidateSearchResult,
} from "@/lib/ats/types";
import {
  searchATSCandidates,
  linkCandidateToATS,
  unlinkCandidateFromATS,
  pushReportToATS,
} from "./ats-actions";
import {
  Building2,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Unlink,
  Link2,
  RotateCcw,
  ShieldCheck,
  Loader2,
  Sparkles,
  Layers,
} from "lucide-react";

type MappingRow = {
  provider: ATSProviderType;
  externalCandidateId: string;
  externalApplicationId: string | null;
  updatedAt: string;
};

type SyncLogRow = {
  provider: ATSProviderType;
  status: "pending" | "success" | "failed";
  attemptCount: number;
  externalRecordReference: string | null;
  httpStatus: number | null;
  sanitizedErrorMessage: string | null;
  lastAttemptedAt: string | null;
  successfulSyncAt: string | null;
};

type Props = {
  interviewId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  interviewStatus: string;
  hasEvaluatedReport: boolean;
  humanReviewDecision: string | null;
  atsConfig: Record<ATSProviderType, ATSConfigStatus>;
  initialMappings: MappingRow[];
  initialSyncLogs: SyncLogRow[];
};

export default function ATSIntegrationSection({
  interviewId,
  candidateId,
  candidateName,
  candidateEmail,
  interviewStatus,
  hasEvaluatedReport,
  humanReviewDecision,
  atsConfig,
  initialMappings,
  initialSyncLogs,
}: Props) {
  const router = useRouter();
  const [selectedProvider, setSelectedProvider] = useState<ATSProviderType>("demo");
  const [isPending, startTransition] = useTransition();

  // Search state
  const [searchQuery, setSearchQuery] = useState(candidateEmail || "");
  const [searchResults, setSearchResults] = useState<ATSCandidateSearchResult[]>([]);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Manual ID input state
  const [manualCandidateId, setManualCandidateId] = useState("");
  const [manualApplicationId, setManualApplicationId] = useState("");

  // Sync state
  const [syncStatusMsg, setSyncStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const currentConfig = atsConfig[selectedProvider];
  const currentMapping = initialMappings.find((m) => m.provider === selectedProvider);
  const currentLog = initialSyncLogs.find((l) => l.provider === selectedProvider);

  // In demo mode, mapping can be auto-generated if absent
  const hasMappingOrDemo = Boolean(currentMapping || selectedProvider === "demo");

  const canSync =
    interviewStatus === "Completed" &&
    hasEvaluatedReport &&
    Boolean(
      humanReviewDecision && ["Hire", "Hold", "Reject"].includes(humanReviewDecision)
    ) &&
    hasMappingOrDemo;

  // Search handler
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchError("");
    setHasSearched(false);

    startTransition(async () => {
      const res = await searchATSCandidates(selectedProvider, searchQuery);
      setHasSearched(true);
      if (!res.success) {
        setSearchError(res.error || "Search failed.");
        setSearchResults([]);
      } else {
        setSearchResults(res.results || []);
      }
    });
  }

  // Link candidate handler
  function handleLink(extCandidateId: string, extAppId?: string) {
    setSyncStatusMsg(null);
    startTransition(async () => {
      const res = await linkCandidateToATS(
        candidateId,
        selectedProvider,
        extCandidateId,
        extAppId
      );
      if (!res.success) {
        setSyncStatusMsg({
          type: "error",
          text: res.error || "Failed to link candidate.",
        });
      } else {
        setSearchResults([]);
        setHasSearched(false);
        router.refresh();
      }
    });
  }

  // Unlink handler
  function handleUnlink() {
    if (!window.confirm(`Unlink this candidate from ${selectedProvider.toUpperCase()}?`)) {
      return;
    }
    setSyncStatusMsg(null);
    startTransition(async () => {
      const res = await unlinkCandidateFromATS(candidateId, selectedProvider);
      if (!res.success) {
        setSyncStatusMsg({
          type: "error",
          text: res.error || "Failed to unlink candidate.",
        });
      } else {
        router.refresh();
      }
    });
  }

  // Push Report handler
  function handlePushReport() {
    const providerLabel =
      selectedProvider === "demo"
        ? "Demo ATS (Simulated)"
        : selectedProvider === "greenhouse"
        ? "Greenhouse Harvest"
        : "Lever v1";

    const confirmed = window.confirm(
      `Confirm sending finalized interview scorecard to ${providerLabel}?\n\n` +
        `Candidate: ${candidateName}\n` +
        `Human Decision: ${humanReviewDecision}\n` +
        `Target External ID: ${currentMapping?.externalCandidateId || `demo-cand-${candidateId.slice(0, 8)}`}`
    );

    if (!confirmed) return;

    setSyncStatusMsg(null);
    startTransition(async () => {
      const result = await pushReportToATS(interviewId, selectedProvider);
      if (result.success) {
        setSyncStatusMsg({
          type: "success",
          text: `Report successfully pushed to ${providerLabel}! Reference: ${result.externalRecordReference || "created"}`,
        });
      } else {
        setSyncStatusMsg({
          type: "error",
          text: result.errorMessage || "Failed to push scorecard to ATS.",
        });
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-6">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              ATS Synchronization
            </h3>
            <p className="text-xs text-slate-400">
              Deliver interview scorecards and notes to Demo ATS, Greenhouse, or Lever
            </p>
          </div>
        </div>

        {/* Provider Toggle Tabs */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/60">
          <button
            type="button"
            onClick={() => {
              setSelectedProvider("demo");
              setSearchResults([]);
              setHasSearched(false);
              setSyncStatusMsg(null);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              selectedProvider === "demo"
                ? "bg-white text-indigo-700 shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Demo ATS
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedProvider("greenhouse");
              setSearchResults([]);
              setHasSearched(false);
              setSyncStatusMsg(null);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              selectedProvider === "greenhouse"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Greenhouse
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedProvider("lever");
              setSearchResults([]);
              setHasSearched(false);
              setSyncStatusMsg(null);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              selectedProvider === "lever"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Lever
          </button>
        </div>
      </div>

      {/* Provider Config Status Badge */}
      <div className="flex items-center justify-between rounded-xl bg-slate-50/70 p-3.5 border border-slate-100 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              currentConfig.configured ? "bg-emerald-500" : "bg-amber-400"
            }`}
          />
          <span className="font-bold text-slate-700 capitalize">
            {selectedProvider === "demo" ? "Demo ATS" : selectedProvider} Status:
          </span>
          <span className={currentConfig.configured ? "text-slate-600" : "text-amber-700 font-medium"}>
            {selectedProvider === "demo"
              ? "Demo Mode — No External ATS Connected"
              : currentConfig.configured
              ? "Configured & Ready"
              : currentConfig.message}
          </span>
        </div>

        {selectedProvider === "demo" ? (
          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-200">
            Simulated Sandbox
          </span>
        ) : !currentConfig.configured ? (
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
            Credentials Pending
          </span>
        ) : null}
      </div>

      {/* Status Feedback banner */}
      {syncStatusMsg && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs font-medium shadow-2xs ${
            syncStatusMsg.type === "success"
              ? "border-emerald-200 bg-emerald-50/90 text-emerald-800"
              : "border-rose-200 bg-rose-50/90 text-rose-800"
          }`}
        >
          {syncStatusMsg.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          )}
          <span>{syncStatusMsg.text}</span>
        </div>
      )}

      {/* Linked Record Display OR Search & Link Box */}
      {currentMapping ? (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 text-indigo-600" />
              Linked {selectedProvider === "demo" ? "Demo ATS" : selectedProvider.toUpperCase()} Record
            </span>

            <button
              type="button"
              disabled={isPending}
              onClick={handleUnlink}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline disabled:opacity-50"
            >
              <Unlink className="h-3 w-3" />
              Unlink
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white rounded-lg p-3 border border-indigo-50">
            <div>
              <p className="text-slate-400 font-medium">External Candidate ID</p>
              <p className="font-mono font-bold text-slate-800 mt-0.5">
                {currentMapping.externalCandidateId}
              </p>
            </div>
            {currentMapping.externalApplicationId && (
              <div>
                <p className="text-slate-400 font-medium">
                  {selectedProvider === "greenhouse" ? "Application ID" : selectedProvider === "lever" ? "Opportunity ID" : "Demo App ID"}
                </p>
                <p className="font-mono font-bold text-slate-800 mt-0.5">
                  {currentMapping.externalApplicationId}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <a
              href={
                selectedProvider === "demo"
                  ? `/admin/demo-ats`
                  : selectedProvider === "greenhouse"
                  ? `https://app.greenhouse.io/people/${currentMapping.externalCandidateId}`
                  : `https://hire.lever.co/candidates/${currentMapping.externalApplicationId || currentMapping.externalCandidateId}`
              }
              target={selectedProvider === "demo" ? "_self" : "_blank"}
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              <span>Open in {selectedProvider === "demo" ? "Demo ATS Dashboard" : selectedProvider === "greenhouse" ? "Greenhouse" : "Lever"}</span>
              <ExternalLink className="h-3 w-3" />
            </a>

            <span className="text-[11px] text-slate-400">
              Linked on {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(currentMapping.updatedAt))}
            </span>
          </div>
        </div>
      ) : selectedProvider === "demo" ? (
        /* Demo Mode: Quick Auto-Link option */
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                Demo ATS Mapping
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Ready to simulate syncing without external accounts. A demo identifier (`demo-cand-{candidateId.slice(0, 8)}`) will be assigned automatically upon pushing, or you can link custom demo records below.
              </p>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleLink(`demo-cand-${candidateId.slice(0, 8)}`, `demo-app-${candidateId.slice(0, 8)}`)}
              className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              Assign Demo Record
            </button>
          </div>
        </div>
      ) : (
        /* Lookup / Link Candidate for Greenhouse & Lever */
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Link Candidate to {selectedProvider === "greenhouse" ? "Greenhouse" : "Lever"}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Search by candidate email or enter the external ATS identifier manually.
            </p>
          </div>

          {/* Search Form */}
          {currentConfig.configured && (
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${selectedProvider} by email or name...`}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                <span>Search</span>
              </button>
            </form>
          )}

          {searchError && (
            <p className="text-xs text-rose-600">{searchError}</p>
          )}

          {/* Search Results List */}
          {hasSearched && (
            <div className="space-y-2">
              {searchResults.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-1.5 border-t border-slate-200 pt-2">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">
                    Select Matching Record:
                  </p>
                  {searchResults.map((res) => (
                    <div
                      key={res.externalCandidateId}
                      className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-slate-200 text-xs hover:border-indigo-300"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{res.name}</p>
                        <p className="text-[11px] text-slate-400">{res.email}</p>
                        {res.jobTitle && (
                          <p className="text-[10px] text-indigo-600 font-medium">{res.jobTitle}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          handleLink(res.externalCandidateId, res.externalApplicationId)
                        }
                        className="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                      >
                        Select &amp; Link
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  No records found in {selectedProvider} matching &quot;{searchQuery}&quot;.
                </p>
              )}
            </div>
          )}

          {/* Manual Link Input */}
          <div className="border-t border-slate-200/80 pt-3">
            <span className="text-[11px] font-semibold text-slate-500 block mb-2">
              Or Link Manually by Identifier:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={manualCandidateId}
                onChange={(e) => setManualCandidateId(e.target.value)}
                placeholder="External Candidate ID *"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-600"
              />
              <input
                type="text"
                value={manualApplicationId}
                onChange={(e) => setManualApplicationId(e.target.value)}
                placeholder={selectedProvider === "greenhouse" ? "Application ID (opt)" : "Opportunity ID (opt)"}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-600"
              />
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                disabled={isPending || !manualCandidateId.trim()}
                onClick={() =>
                  handleLink(
                    manualCandidateId.trim(),
                    manualApplicationId.trim() || undefined
                  )
                }
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Link2 className="h-3 w-3" />
                <span>Link Identifier</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Action Area */}
      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {selectedProvider === "demo" ? "Simulate ATS Sync (Demo Mode)" : "Synchronize Interview Result"}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedProvider === "demo"
                ? "Stores the candidate scorecard in the Demo ATS Supabase database for inspection."
                : "Sends overall score, skill breakdown, insights, AI suggestion & human decision."}
            </p>
          </div>

          <button
            type="button"
            disabled={isPending || !canSync}
            onClick={handlePushReport}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>
              {selectedProvider === "demo"
                ? "Simulate Push to Demo ATS"
                : `Push Report to ${selectedProvider === "greenhouse" ? "Greenhouse" : "Lever"}`}
            </span>
          </button>
        </div>

        {/* Validation warnings if not eligible */}
        {!canSync && (
          <div className="rounded-lg bg-slate-100/90 p-2.5 text-[11px] text-slate-500 space-y-1 border border-slate-200/50">
            <span className="font-bold text-slate-700 block">Synchronization Checklist:</span>
            <p className={interviewStatus === "Completed" ? "text-emerald-700" : "text-amber-700"}>
              • Interview completed: {interviewStatus === "Completed" ? "Yes" : `No (${interviewStatus})`}
            </p>
            <p className={hasEvaluatedReport ? "text-emerald-700" : "text-amber-700"}>
              • Evaluation report generated: {hasEvaluatedReport ? "Yes" : "No (Run AI Eval first)"}
            </p>
            <p className={humanReviewDecision ? "text-emerald-700" : "text-amber-700"}>
              • Final human decision submitted: {humanReviewDecision ? `Yes (${humanReviewDecision})` : "No (Pending human review)"}
            </p>
            {selectedProvider !== "demo" && (
              <p className={currentMapping ? "text-emerald-700" : "text-amber-700"}>
                • Linked to external {selectedProvider} candidate: {currentMapping ? "Yes" : "No (Link candidate above)"}
              </p>
            )}
          </div>
        )}

        {/* Sync History / Audit Logs */}
        {currentLog && (
          <div className="pt-2 border-t border-slate-200/60 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">
                Last Sync Attempt ({selectedProvider === "demo" ? "Simulated" : "Live"}):
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                  currentLog.status === "success"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {currentLog.status === "success" ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <AlertCircle className="h-3 w-3" />
                )}
                {currentLog.status.toUpperCase()}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap gap-x-4 text-[11px] text-slate-500">
              {currentLog.lastAttemptedAt && (
                <span>
                  Timestamp: {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(currentLog.lastAttemptedAt))}
                </span>
              )}
              <span>Attempts: {currentLog.attemptCount}</span>
              {currentLog.externalRecordReference && (
                <span className="font-mono text-indigo-600">
                  Ref: {currentLog.externalRecordReference}
                </span>
              )}
              {selectedProvider === "demo" && (
                <a
                  href="/admin/demo-ats"
                  className="font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <span>View in Demo ATS Dashboard</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>

            {currentLog.sanitizedErrorMessage && (
              <p className="mt-1 text-[11px] text-rose-600 font-mono">
                Error: {currentLog.sanitizedErrorMessage}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
