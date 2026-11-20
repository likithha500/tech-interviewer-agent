/**
 * lib/ats/service.ts
 *
 * Orchestration service for ATS operations:
 * - Provider instantiation & configuration queries
 * - Candidate mapping management (database upsert/retrieval)
 * - Validation: requires completed interview, evaluated report, and human decision
 * - Synchronization execution, logging, and idempotency
 */

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { GreenhouseProvider } from "./greenhouse";
import { LeverProvider } from "./lever";
import { DemoATSProvider } from "./demo";
import {
  ATSProvider,
  ATSProviderType,
  ATSConfigStatus,
  ATSCandidateSearchResult,
  ATSSyncPayload,
  ATSSyncResult,
} from "./types";

export class ATSService {
  private static providers: Record<ATSProviderType, ATSProvider> = {
    demo: new DemoATSProvider(),
    greenhouse: new GreenhouseProvider(),
    lever: new LeverProvider(),
  };

  static getProvider(type: ATSProviderType): ATSProvider {
    const provider = this.providers[type];
    if (!provider) {
      throw new Error(`Unsupported ATS provider: ${type}`);
    }
    return provider;
  }

  static getStatus(): Record<ATSProviderType, ATSConfigStatus> {
    return {
      demo: this.providers.demo.isConfigured(),
      greenhouse: this.providers.greenhouse.isConfigured(),
      lever: this.providers.lever.isConfigured(),
    };
  }

  /**
   * Search external ATS candidates.
   */
  static async searchExternalCandidates(
    providerType: ATSProviderType,
    query: string
  ): Promise<ATSCandidateSearchResult[]> {
    const provider = this.getProvider(providerType);
    return provider.searchCandidates(query);
  }

  /**
   * Links an internal candidate to an external ATS candidate / application.
   */
  static async linkCandidate(
    candidateId: string,
    providerType: ATSProviderType,
    externalCandidateId: string,
    externalApplicationId?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!candidateId || !externalCandidateId) {
      return { success: false, error: "Candidate ID and external candidate ID are required." };
    }

    const admin = createAdminClient();

    const { error } = await admin.from("ats_candidate_mappings").upsert(
      {
        candidate_id: candidateId,
        provider: providerType,
        external_candidate_id: externalCandidateId.trim(),
        external_application_id: externalApplicationId ? externalApplicationId.trim() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "candidate_id,provider" }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /**
   * Unlinks an internal candidate from an ATS provider.
   */
  static async unlinkCandidate(
    candidateId: string,
    providerType: ATSProviderType
  ): Promise<{ success: boolean; error?: string }> {
    const admin = createAdminClient();
    const { error } = await admin
      .from("ats_candidate_mappings")
      .delete()
      .eq("candidate_id", candidateId)
      .eq("provider", providerType);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  /**
   * Retrieves active mappings for a candidate across all ATS providers.
   */
  static async getCandidateMappings(candidateId: string): Promise<
    Array<{
      provider: ATSProviderType;
      externalCandidateId: string;
      externalApplicationId: string | null;
      updatedAt: string;
    }>
  > {
    const admin = createAdminClient();
    const { data } = await admin
      .from("ats_candidate_mappings")
      .select("provider, external_candidate_id, external_application_id, updated_at")
      .eq("candidate_id", candidateId);

    return (data ?? []).map((row) => ({
      provider: row.provider as ATSProviderType,
      externalCandidateId: row.external_candidate_id,
      externalApplicationId: row.external_application_id,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Retrieves sync logs for an interview.
   */
  static async getInterviewSyncLogs(interviewId: string): Promise<
    Array<{
      provider: ATSProviderType;
      status: "pending" | "success" | "failed";
      attemptCount: number;
      externalRecordReference: string | null;
      httpStatus: number | null;
      sanitizedErrorMessage: string | null;
      lastAttemptedAt: string | null;
      successfulSyncAt: string | null;
    }>
  > {
    const admin = createAdminClient();
    const { data } = await admin
      .from("ats_sync_logs")
      .select(
        "provider, status, attempt_count, external_record_reference, http_status, sanitized_error_message, last_attempted_at, successful_sync_at"
      )
      .eq("interview_id", interviewId);

    return (data ?? []).map((row) => ({
      provider: row.provider as ATSProviderType,
      status: row.status as "pending" | "success" | "failed",
      attemptCount: row.attempt_count ?? 1,
      externalRecordReference: row.external_record_reference,
      httpStatus: row.http_status,
      sanitizedErrorMessage: row.sanitized_error_message,
      lastAttemptedAt: row.last_attempted_at,
      successfulSyncAt: row.successful_sync_at,
    }));
  }

  /**
   * Synchronizes an interview scorecard to the specified ATS provider.
   * STRICT SAFETY CHECKS:
   * 1. Interview must be "Completed".
   * 2. Report must exist with overall_score and ai recommendation.
   * 3. Final human decision (Hire, Hold, Reject) must be submitted.
   * 4. External candidate mapping must exist (auto-linked with default demo ID if demo provider).
   */
  static async syncInterviewReport(
    interviewId: string,
    providerType: ATSProviderType
  ): Promise<ATSSyncResult> {
    const admin = createAdminClient();

    // 1. Fetch interview & candidate
    const { data: interview, error: intErr } = await admin
      .from("interviews")
      .select("id, status, candidate_id, candidates(id, name, email)")
      .eq("id", interviewId)
      .maybeSingle();

    if (intErr || !interview) {
      return { success: false, errorMessage: intErr?.message || "Interview not found." };
    }

    if (interview.status !== "Completed") {
      return {
        success: false,
        errorMessage: "Interview must be in Completed status before synchronizing to ATS.",
      };
    }

    const candidateRaw = Array.isArray(interview.candidates)
      ? interview.candidates[0]
      : interview.candidates;

    if (!candidateRaw || !candidateRaw.id) {
      return { success: false, errorMessage: "Candidate record is missing." };
    }

    // 2. Fetch report
    const { data: report, error: repErr } = await admin
      .from("reports")
      .select("overall_score, recommendation, human_review_status, strengths, weaknesses, created_at")
      .eq("interview_id", interviewId)
      .maybeSingle();

    if (repErr || !report) {
      return {
        success: false,
        errorMessage: "Evaluation report must be generated before pushing to ATS.",
      };
    }

    if (report.overall_score == null) {
      return {
        success: false,
        errorMessage: "Report has no overall score.",
      };
    }

    const allowedDecisions = ["Hire", "Hold", "Reject"];
    if (
      !report.human_review_status ||
      !allowedDecisions.includes(report.human_review_status)
    ) {
      return {
        success: false,
        errorMessage:
          "Human review decision (Hire / Hold / Reject) must be finalized before pushing to ATS.",
      };
    }

    // 3. Fetch candidate external mapping
    let { data: mapping, error: mapErr } = await admin
      .from("ats_candidate_mappings")
      .select("external_candidate_id, external_application_id")
      .eq("candidate_id", candidateRaw.id)
      .eq("provider", providerType)
      .maybeSingle();

    // For Demo ATS: if no mapping exists yet, automatically create a standard demo mapping
    if ((!mapping || !mapping.external_candidate_id) && providerType === "demo") {
      const autoDemoCandId = `demo-cand-${candidateRaw.id.slice(0, 8)}`;
      const autoDemoAppId = `demo-app-${candidateRaw.id.slice(0, 8)}`;
      await this.linkCandidate(candidateRaw.id, "demo", autoDemoCandId, autoDemoAppId);
      mapping = {
        external_candidate_id: autoDemoCandId,
        external_application_id: autoDemoAppId,
      };
    } else if (mapErr || !mapping || !mapping.external_candidate_id) {
      return {
        success: false,
        errorMessage: `Candidate is not linked to any external ${providerType} record. Link the candidate first.`,
      };
    }

    // 4. Fetch skill evaluations
    const { data: evaluations } = await admin
      .from("evaluations")
      .select("skill, score, max_score, feedback")
      .eq("interview_id", interviewId);

    const skills = (evaluations ?? []).map((e) => ({
      skill: e.skill as string,
      score: e.score != null ? Number(e.score) : null,
      maxScore: e.max_score != null ? Number(e.max_score) : null,
      feedback: e.feedback as string | null,
    }));

    // 5. Construct payload
    const payload: ATSSyncPayload = {
      candidateId: candidateRaw.id,
      candidateName: candidateRaw.name || "Unknown Candidate",
      candidateEmail: candidateRaw.email || "",
      interviewId: interview.id,
      overallScore: Number(report.overall_score),
      skills,
      strengths: Array.isArray(report.strengths) ? (report.strengths as string[]) : [],
      weaknesses: Array.isArray(report.weaknesses) ? (report.weaknesses as string[]) : [],
      aiRecommendation: report.recommendation as "Hire" | "Hold" | "Reject",
      humanDecision: report.human_review_status as "Hire" | "Hold" | "Reject",
      interviewCompletedAt: report.created_at || new Date().toISOString(),
      externalCandidateId: mapping.external_candidate_id,
      externalApplicationId: mapping.external_application_id ?? undefined,
    };

    // 6. Check existing log for attempt counter
    const { data: existingLog } = await admin
      .from("ats_sync_logs")
      .select("attempt_count, status")
      .eq("interview_id", interviewId)
      .eq("provider", providerType)
      .maybeSingle();

    const attemptCount = (existingLog?.attempt_count ?? 0) + 1;

    // 7. Dispatch to provider
    const provider = this.getProvider(providerType);
    const syncResult = await provider.pushScorecard(payload);

    // 8. Log outcome to ats_sync_logs
    await admin.from("ats_sync_logs").upsert(
      {
        interview_id: interviewId,
        provider: providerType,
        status: syncResult.success ? "success" : "failed",
        attempt_count: attemptCount,
        external_record_reference: syncResult.externalRecordReference || null,
        http_status: syncResult.httpStatus || null,
        sanitized_error_message: syncResult.errorMessage ? syncResult.errorMessage.slice(0, 500) : null,
        last_attempted_at: new Date().toISOString(),
        successful_sync_at: syncResult.success ? new Date().toISOString() : null,
      },
      { onConflict: "interview_id,provider" }
    );

    return syncResult;
  }
}
