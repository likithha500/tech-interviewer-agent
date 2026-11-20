/**
 * lib/ats/greenhouse.ts
 *
 * Official Greenhouse Harvest API integration.
 * - Base URL: https://harvest.greenhouse.io/v1 (or via GREENHOUSE_API_URL)
 * - Auth: HTTP Basic with API Key as username and empty password.
 * - Header: 'On-Behalf-Of' required for POST actions (GREENHOUSE_ON_BEHALF_OF_USER_ID).
 * - Operations:
 *   - Search candidates: GET /v1/candidates?email=...
 *   - Push scorecard/interview note: POST /v1/candidates/{id}/activity_feed/notes
 *     (Greenhouse Harvest v1 does not support public POST /v1/scorecards; candidate activity feed notes
 *      are the official, supported mechanism for third-party evaluation tools to attach comprehensive
 *      interview feedback directly to the candidate file).
 */

import "server-only";
import {
  ATSProvider,
  ATSConfigStatus,
  ATSCandidateSearchResult,
  ATSSyncPayload,
  ATSSyncResult,
} from "./types";

export class GreenhouseProvider implements ATSProvider {
  readonly providerType = "greenhouse" as const;

  private getBaseUrl(): string {
    return process.env.GREENHOUSE_API_URL?.replace(/\/+$/, "") || "https://harvest.greenhouse.io/v1";
  }

  private getApiKey(): string | null {
    return process.env.GREENHOUSE_API_KEY || null;
  }

  private getOnBehalfOfUserId(): string | null {
    return process.env.GREENHOUSE_ON_BEHALF_OF_USER_ID || null;
  }

  isConfigured(): ATSConfigStatus {
    const key = this.getApiKey();
    const onBehalfOf = this.getOnBehalfOfUserId();

    if (!key) {
      return {
        configured: false,
        provider: this.providerType,
        message: "GREENHOUSE_API_KEY is not configured.",
      };
    }

    if (!onBehalfOf) {
      return {
        configured: false,
        provider: this.providerType,
        message: "GREENHOUSE_ON_BEHALF_OF_USER_ID is not configured (required for activity feed notes).",
      };
    }

    return {
      configured: true,
      provider: this.providerType,
      message: "Greenhouse Harvest API is configured.",
      details: {
        baseUrl: this.getBaseUrl(),
        onBehalfOfUserId: onBehalfOf,
      },
    };
  }

  private getHeaders(): HeadersInit {
    const key = this.getApiKey() || "";
    const authString = Buffer.from(`${key}:`).toString("base64");
    const headers: Record<string, string> = {
      Authorization: `Basic ${authString}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const onBehalfOf = this.getOnBehalfOfUserId();
    if (onBehalfOf) {
      headers["On-Behalf-Of"] = onBehalfOf;
    }

    return headers;
  }

  async searchCandidates(query: string): Promise<ATSCandidateSearchResult[]> {
    const config = this.isConfigured();
    if (!config.configured) {
      throw new Error(config.message || "Greenhouse API is not configured.");
    }

    const trimmed = query.trim();
    if (!trimmed) return [];

    // Greenhouse Harvest v1 supports ?email=...
    const url = new URL(`${this.getBaseUrl()}/candidates`);
    if (trimmed.includes("@")) {
      url.searchParams.set("email", trimmed);
    } else {
      url.searchParams.set("per_page", "20");
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
          throw new Error("Greenhouse authentication failed. Check GREENHOUSE_API_KEY and permissions.");
        }
        if (response.status === 429) {
          throw new Error("Greenhouse Harvest API rate limit exceeded.");
        }
        throw new Error(`Greenhouse API returned status ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) return [];

      return data
        .filter((c: any) => {
          if (!trimmed.includes("@")) {
            const fullName = `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase();
            return fullName.includes(trimmed.toLowerCase());
          }
          return true;
        })
        .map((c: any) => {
          const name = `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unknown";
          const email = Array.isArray(c.email_addresses) && c.email_addresses[0]?.value
            ? c.email_addresses[0].value
            : "";
          const primaryApp = Array.isArray(c.applications) && c.applications.length > 0
            ? c.applications[0]
            : null;

          return {
            externalCandidateId: String(c.id),
            name,
            email,
            externalApplicationId: primaryApp ? String(primaryApp.id) : undefined,
            jobTitle: primaryApp?.jobs?.[0]?.name,
            profileUrl: `https://app.greenhouse.io/people/${c.id}`,
          };
        });
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error("Greenhouse API request timed out after 10 seconds.");
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

    if (!payload.externalCandidateId) {
      return {
        success: false,
        errorMessage: "External Greenhouse candidate ID is required.",
      };
    }

    const noteBody = this.formatInterviewNote(payload);
    const targetUrl = `${this.getBaseUrl()}/candidates/${encodeURIComponent(payload.externalCandidateId)}/activity_feed/notes`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          body: noteBody,
          visibility: "public",
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
          errorMessage: `Greenhouse Harvest API rate limit reached. Retry after ${retryAfter}s.`,
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          httpStatus: response.status,
          errorMessage: "Greenhouse authentication/permission denied. Verify Harvest API key permissions for candidate notes.",
        };
      }

      if (!response.ok) {
        const detail = responseJson?.message || responseText.slice(0, 300) || "Unknown error";
        return {
          success: false,
          httpStatus: response.status,
          errorMessage: `Greenhouse API error (${response.status}): ${detail}`,
        };
      }

      const noteId = responseJson?.id ? String(responseJson.id) : "created";
      const recordUrl = this.getRecordUrl(payload.externalCandidateId);

      return {
        success: true,
        httpStatus: response.status,
        externalRecordReference: `note_${noteId}`,
        externalUrl: recordUrl ?? undefined,
      };
    } catch (err: any) {
      if (err.name === "AbortError") {
        return {
          success: false,
          errorMessage: "Greenhouse API request timed out after 12 seconds.",
        };
      }
      return {
        success: false,
        errorMessage: err.message || "Failed to connect to Greenhouse Harvest API.",
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  getRecordUrl(externalCandidateId: string): string | null {
    if (!externalCandidateId) return null;
    return `https://app.greenhouse.io/people/${externalCandidateId}`;
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
