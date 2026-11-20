/**
 * lib/ats/demo.ts
 *
 * Demo ATS Provider:
 * - Provider identifier: "demo"
 * - No external API calls or third-party credentials required.
 * - Stores received candidate reports directly in the `demo_ats_records` Supabase table.
 * - Generates unique demo record IDs.
 * - Prevents duplicate records for the same interview (upserts idempotently).
 * - Records synchronization timestamps and links directly to the Demo ATS admin dashboard.
 */

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ATSProvider,
  ATSConfigStatus,
  ATSCandidateSearchResult,
  ATSSyncPayload,
  ATSSyncResult,
} from "./types";

export class DemoATSProvider implements ATSProvider {
  readonly providerType = "demo" as const;

  isConfigured(): ATSConfigStatus {
    return {
      configured: true,
      provider: this.providerType,
      message: "Demo Mode — No External ATS Connected",
      details: {
        mode: "simulated_local",
        storage: "supabase.demo_ats_records",
      },
    };
  }

  async searchCandidates(query: string): Promise<ATSCandidateSearchResult[]> {
    const trimmed = query.trim().toLowerCase();
    const admin = createAdminClient();

    // Query internal candidates to provide a realistic Demo ATS search experience
    let dbQuery = admin.from("candidates").select("id, name, email, application_id, college").limit(10);

    if (trimmed.includes("@")) {
      dbQuery = dbQuery.ilike("email", `%${trimmed}%`);
    } else if (trimmed) {
      dbQuery = dbQuery.ilike("name", `%${trimmed}%`);
    }

    const { data: candidates, error } = await dbQuery;

    if (error || !candidates) {
      return [];
    }

    return candidates.map((c) => ({
      externalCandidateId: `demo-cand-${c.id.slice(0, 8)}`,
      name: c.name || "Unknown Candidate",
      email: c.email || "",
      externalApplicationId: `demo-app-${c.id.slice(0, 8)}`,
      jobTitle: "Full Stack Engineer (Demo Role)",
      profileUrl: `/admin/demo-ats?candidateId=${c.id}`,
    }));
  }

  async pushScorecard(payload: ATSSyncPayload): Promise<ATSSyncResult> {
    const admin = createAdminClient();

    const evaluationFeedback = this.formatFeedbackSummary(payload);

    // Upsert into demo_ats_records to guarantee idempotency and avoid duplicates
    const { data, error } = await admin
      .from("demo_ats_records")
      .upsert(
        {
          interview_id: payload.interviewId,
          candidate_id: payload.candidateId,
          candidate_name: payload.candidateName,
          candidate_email: payload.candidateEmail || null,
          overall_score: payload.overallScore,
          skill_scores: payload.skills,
          strengths: payload.strengths,
          weaknesses: payload.weaknesses,
          ai_recommendation: payload.aiRecommendation,
          final_human_decision: payload.humanDecision,
          evaluation_feedback: evaluationFeedback,
          received_at: new Date().toISOString(),
        },
        { onConflict: "interview_id" }
      )
      .select("id")
      .maybeSingle();

    if (error) {
      return {
        success: false,
        httpStatus: 500,
        errorMessage: `Demo ATS storage failed: ${error.message}`,
      };
    }

    const demoRecordId = data?.id ? String(data.id) : `demo_rec_${Date.now()}`;
    const externalUrl = this.getRecordUrl(payload.externalCandidateId, payload.externalApplicationId);

    return {
      success: true,
      httpStatus: 200,
      externalRecordReference: `demo_ats_${demoRecordId}`,
      externalUrl: externalUrl ?? undefined,
    };
  }

  getRecordUrl(externalCandidateId: string, externalApplicationId?: string): string | null {
    return `/admin/demo-ats`;
  }

  private formatFeedbackSummary(p: ATSSyncPayload): string {
    const skillList = p.skills
      .map((s) => `${s.skill}: ${s.score ?? 0}/${s.maxScore ?? 10}${s.feedback ? ` (${s.feedback})` : ""}`)
      .join("; ");

    return `Simulated Demo ATS Scorecard — Overall: ${p.overallScore}%. Skills: [${skillList}]. Strengths: [${p.strengths.join(", ")}]. Areas for Improvement: [${p.weaknesses.join(", ")}].`;
  }
}
