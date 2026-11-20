/**
 * lib/ats/types.ts
 * Shared data structures and contracts for ATS (Applicant Tracking System) providers.
 */

export type ATSProviderType = "greenhouse" | "lever" | "demo";

export type ATSConfigStatus = {
  configured: boolean;
  provider: ATSProviderType;
  message?: string;
  details?: Record<string, unknown>;
};

export type ATSCandidateSearchResult = {
  externalCandidateId: string;
  name: string;
  email: string;
  externalApplicationId?: string; // Application ID in Greenhouse, Opportunity ID in Lever, or Demo Job App ID
  jobTitle?: string;
  profileUrl?: string;
};

export type ATSSyncPayload = {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  interviewId: string;
  overallScore: number;
  skills: Array<{
    skill: string;
    score: number | null;
    maxScore: number | null;
    feedback?: string | null;
  }>;
  strengths: string[];
  weaknesses: string[];
  aiRecommendation: "Hire" | "Hold" | "Reject";
  humanDecision: "Hire" | "Hold" | "Reject";
  interviewCompletedAt: string;
  externalCandidateId: string;
  externalApplicationId?: string;
};

export type ATSSyncResult = {
  success: boolean;
  httpStatus?: number;
  externalRecordReference?: string;
  externalUrl?: string;
  errorMessage?: string;
  rateLimited?: boolean;
  retryAfterSeconds?: number;
};

export interface ATSProvider {
  readonly providerType: ATSProviderType;

  /**
   * Checks whether required server-only environment variables and settings exist.
   */
  isConfigured(): ATSConfigStatus;

  /**
   * Searches candidates/applications in the ATS by query (email or name).
   */
  searchCandidates(query: string): Promise<ATSCandidateSearchResult[]>;

  /**
   * Submits the structured interview scorecard/feedback to the target candidate/application.
   */
  pushScorecard(payload: ATSSyncPayload): Promise<ATSSyncResult>;

  /**
   * Returns a direct browser URL to view the record in the ATS if known.
   */
  getRecordUrl(externalCandidateId: string, externalApplicationId?: string): string | null;
}
