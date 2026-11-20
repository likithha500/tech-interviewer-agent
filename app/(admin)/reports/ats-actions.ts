"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ATSService } from "@/lib/ats/service";
import { ATSProviderType, ATSConfigStatus, ATSCandidateSearchResult, ATSSyncResult } from "@/lib/ats/types";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || user.app_metadata?.role !== "admin") {
    redirect("/login");
  }
  return user;
}

export async function getATSStatus(): Promise<Record<ATSProviderType, ATSConfigStatus>> {
  await requireAdmin();
  return ATSService.getStatus();
}

export async function searchATSCandidates(
  provider: ATSProviderType,
  query: string
): Promise<{ success: boolean; results?: ATSCandidateSearchResult[]; error?: string }> {
  await requireAdmin();
  try {
    const results = await ATSService.searchExternalCandidates(provider, query);
    return { success: true, results };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to search ATS candidates." };
  }
}

export async function linkCandidateToATS(
  candidateId: string,
  provider: ATSProviderType,
  externalCandidateId: string,
  externalApplicationId?: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const result = await ATSService.linkCandidate(
    candidateId,
    provider,
    externalCandidateId,
    externalApplicationId
  );
  if (result.success) {
    revalidatePath("/reports");
  }
  return result;
}

export async function unlinkCandidateFromATS(
  candidateId: string,
  provider: ATSProviderType
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const result = await ATSService.unlinkCandidate(candidateId, provider);
  if (result.success) {
    revalidatePath("/reports");
  }
  return result;
}

export async function pushReportToATS(
  interviewId: string,
  provider: ATSProviderType
): Promise<ATSSyncResult> {
  await requireAdmin();
  const result = await ATSService.syncInterviewReport(interviewId, provider);
  revalidatePath("/reports");
  return result;
}
