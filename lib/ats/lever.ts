/**
 * lib/ats/lever.ts
 *
 * Official Lever v1 Data API integration.
 * - Base URL: https://api.lever.co/v1 (or via LEVER_API_URL, with sandbox/EU region support)
 * - Auth: HTTP Basic with API Key as username and empty password.
 * - Model:
 *   - Lever represents candidate job candidacies as "Opportunities".
 *   - Search: GET /v1/opportunities?email=...
 *   - Submit Feedback/Notes: POST /v1/opportunities/{opportunity_id}/notes
 *     (Notes are the universal, supported endpoint in Lever v1 for external assessment
 *      platforms without requiring predefined proprietary feedback template schemas).
 */

import "server-only";
import {
  ATSProvider,
  ATSConfigStatus,
  ATSCandidateSearchResult,
  ATSSyncPayload,
  ATSSyncResult,
} from "./types";

export class LeverProvider implements ATSProvider {
  readonly providerType = "lever" as const;

  private getBaseUrl(): string {
    return process.env.LEVER_API_URL?.replace(/\/+$/, "") || "https://api.lever.co/v1";
  }

  private getApiKey(): string | null {
    return process.env.LEVER_API_KEY || null;
  }

  isConfigured(): ATSConfigStatus {
    const key = this.getApiKey();

    if (!key) {
      return {
        configured: false,
        provider: this.providerType,
        message: "LEVER_API_KEY is not configured.",
      };
    }

    return {
      configured: true,
      provider: this.providerType,
      message: "Lever v1 Data API is configured.",
      details: {
        baseUrl: this.getBaseUrl(),
      },
    };
  }

  private getHeaders(): HeadersInit {
    const key = this.getApiKey() || "";
    const authString = Buffer.from(`${key}:`).toString("base64");
    return {
      Authorization: `Basic ${authString}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  async searchCandidates(query: string): Promise<ATSCandidateSearchResult[]> {
    const config = this.isConfigured();
    if (!config.configured) {
      throw new Error(config.message || "Lever API is not configured.");
    }

    const trimmed = query.trim();
    if (!trimmed) return [];

    const url = new URL(`${this.getBaseUrl()}/opportunities`);
    if (trimmed.includes("@")) {
      url.searchParams.set("email", trimmed);
    } else {
      url.searchParams.set("limit", "20");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Lever authentication failed. Check LEVER_API_KEY and permissions.");
        }
        if (response.status === 429) {
          throw new Error("Lever API rate limit exceeded.");
        }
        throw new Error(`Lever API returned status ${response.status}`);
      }

      const body = await response.json();
      const list = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];

      return list
        .filter((opp: any) => {
          if (!trimmed.includes("@")) {
            const name = (opp.name || "").toLowerCase();
            return name.includes(trimmed.toLowerCase());
          }
          return true;
        })
        .map((opp: any) => {
          const email = Array.isArray(opp.emails) && opp.emails.length > 0
            ? opp.emails[0]
            : "";
          const oppId = String(opp.id);
          const contactId = opp.contact ? String(opp.contact) : oppId;

          return {
            externalCandidateId: contactId,
            externalApplicationId: oppId, // Lever Opportunity ID
            name: opp.name || "Unknown Candidate",
            email,
            jobTitle: opp.headline || opp.posting?.text || "General Opportunity",
            profileUrl: `https://hire.lever.co/candidates/${oppId}`,
          };
        });
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error("Lever API request timed out after 10 seconds.");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  async pushScorecard(payload: ATSSyncPayload): Promise<ATSSyncResult> {
    const config = this.isConfigured();
    if (!config.configured) {
      return {
        success: false,
        errorMessage: config.message,
      };
    }

    // In Lever, feedback notes are attached to the opportunity ID.
    // If externalApplicationId is provided, use it; otherwise fallback to externalCandidateId.
    const targetOppId = payload.externalApplicationId || payload.externalCandidateId;

    if (!targetOppId) {
      return {
        success: false,
        errorMessage: "External Lever opportunity/candidate ID is required.",
      };
    }

    const noteText = this.formatInterviewNote(payload);
    const targetUrl = `${this.getBaseUrl()}/opportunities/${encodeURIComponent(targetOppId)}/notes`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          text: noteText,
          secret: false,
        }),
        signal: controller.signal,
      });

      const responseText = await response.text();
      let responseJson: any = null;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        // text response
      }

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After")) || 30;
        return {
          success: false,
          httpStatus: 429,
          rateLimited: true,
          retryAfterSeconds: retryAfter,
          errorMessage: `Lever API rate limit reached. Retry after ${retryAfter}s.`,
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          httpStatus: response.status,
          errorMessage: "Lever authentication/permission denied. Verify LEVER_API_KEY permissions.",
        };
      }

      if (!response.ok) {
        const detail = responseJson?.message || responseText.slice(0, 300) || "Unknown error";
        return {
          success: false,
          httpStatus: response.status,
          errorMessage: `Lever API error (${response.status}): ${detail}`,
        };
      }

      const noteId = responseJson?.data?.id || responseJson?.id ? String(responseJson?.data?.id || responseJson?.id) : "created";
      const recordUrl = this.getRecordUrl(payload.externalCandidateId, targetOppId);

      return {
        success: true,
        httpStatus: response.status,
        externalRecordReference: `lever_note_${noteId}`,
        externalUrl: recordUrl ?? undefined,
      };
    } catch (err: any) {
      if (err.name === "AbortError") {
        return {
          success: false,
          errorMessage: "Lever API request timed out after 12 seconds.",
        };
      }
      return {
        success: false,
        errorMessage: err.message || "Failed to connect to Lever API.",
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  getRecordUrl(externalCandidateId: string, externalApplicationId?: string): string | null {
    const oppId = externalApplicationId || externalCandidateId;
    if (!oppId) return null;
    return `https://hire.lever.co/candidates/${oppId}`;
  }

  private formatInterviewNote(p: ATSSyncPayload): string {
    const dateFormatted = new Date(p.interviewCompletedAt).toLocaleString("en-US", {
      timeZone: "UTC",
      dateStyle: "medium",
      timeStyle: "short",
    });

    const skillLines = p.skills
      .map((s) => {
        const scoreStr = s.score != null && s.maxScore != null ? `${s.score}/${s.maxScore}` : "N/A";
        const fb = s.feedback ? ` — ${s.feedback}` : "";
        return `• ${s.skill}: ${scoreStr}${fb}`;
      })
      .join("\n");

    const strengthsStr = p.strengths.length > 0 ? p.strengths.join(", ") : "None specified";
    const weaknessesStr = p.weaknesses.length > 0 ? p.weaknesses.join(", ") : "None specified";

    return `=== TECH INTERVIEWER AGENT: FINAL INTERVIEW SCORECARD ===
Candidate: ${p.candidateName} (${p.candidateEmail})
Interview ID: ${p.interviewId}
Completed At: ${dateFormatted} UTC

--- EVALUATION SUMMARY ---
Overall Score: ${p.overallScore}%
AI Advisory Recommendation: ${p.aiRecommendation} (Automated preliminary analysis - advisory only)
Final Human Decision: ${p.humanDecision} (Official hiring decision submitted by reviewer)

--- SKILL BREAKDOWN ---
${skillLines || "No skill data recorded."}

--- KEY INSIGHTS ---
Strengths: ${strengthsStr}
Areas for Improvement: ${weaknessesStr}

---
Verified and synchronized via Tech Interviewer Agent.`;
  }
}
