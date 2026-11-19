
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EvaluateButton } from "./EvaluateButton";
import { SkillBreakdown } from "./SkillBreakdown";
import { HumanReviewButtons } from "./HumanReviewButtons";
import { connection } from "next/server";
import { Suspense } from "react";
// ─── Types ────────────────────────────────────────────────────────────────────

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

type ReportRow = {
  overall_score: number | null;
  recommendation: string | null;
  human_review_status: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
} | null;

type InterviewRow = {
  id: string;
  status: string;
  created_at: string;
  candidate: { name: string; email: string } | null;
  report: ReportRow;
  skills: SkillRow[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function RecommendationBadge({
  value,
}: {
  value: string | null | undefined;
}) {
  if (!value) return <span className="text-gray-400 text-xs">Not evaluated</span>;
  const colors: Record<string, string> = {
    Hire: "bg-green-100 text-green-700",
    Hold: "bg-amber-100 text-amber-700",
    Reject: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[value] ?? "bg-gray-100 text-gray-700"
        }`}
    >
      {value}
    </span>
  );
}

function ReviewBadge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-gray-400 text-xs">—</span>;
  const colors: Record<string, string> = {
    Pending: "bg-amber-100 text-amber-700",
    Approved: "bg-green-100 text-green-700",
    Rejected: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[value] ?? "bg-gray-100 text-gray-700"
        }`}
    >
      {value}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

async function ReportsContent() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null; // layout handles redirect

  const admin = createAdminClient();

  // Fetch interviews with candidates and reports
  const { data: interviews, error } = await admin
    .from("interviews")
    .select(
      `
      id,
      status,
      created_at,
      candidates ( name, email ),
      reports (
        overall_score,
        recommendation,
        human_review_status,
        strengths,
        weaknesses
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="p-6 text-red-600">
        Failed to load reports: {error.message}
      </div>
    );
  }

  // Fetch all evaluations for all interviews
  const interviewIds = (interviews ?? []).map((i) => i.id as string);

  let evalsByInterview = new Map<string, SkillRow[]>();

  if (interviewIds.length > 0) {
    const { data: evals } = await admin
      .from("evaluations")
      .select("interview_id, skill, score, max_score, feedback, evidence")
      .in("interview_id", interviewIds);

    for (const ev of evals ?? []) {
      const iid = ev.interview_id as string;
      const list = evalsByInterview.get(iid) ?? [];
      list.push({
        skill: ev.skill as string,
        score: ev.score as number | null,
        max_score: ev.max_score as number | null,
        feedback: ev.feedback as string | null,
        evidence: ev.evidence as EvidenceItem[] | null,
      });
      evalsByInterview.set(iid, list);
    }
  }

  // Build typed rows
  const rows: InterviewRow[] = (interviews ?? []).map((item) => {
    const candidateRaw = Array.isArray(item.candidates)
      ? item.candidates[0]
      : item.candidates;
    const reportRaw = Array.isArray(item.reports)
      ? item.reports[0]
      : item.reports;

    return {
      id: item.id as string,
      status: item.status as string,
      created_at: item.created_at as string,
      candidate: candidateRaw as { name: string; email: string } | null,
      report: reportRaw as ReportRow,
      skills: evalsByInterview.get(item.id as string) ?? [],
    };
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">
        Reports &amp; Scorecards
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        AI-generated recommendations are advisory only. Final hiring decisions
        require human review.
      </p>

      <div className="overflow-x-auto rounded-xl bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-xs uppercase text-gray-500">
            <tr>
              <th className="p-4 font-medium">Candidate</th>
              <th className="p-4 font-medium">Interview Date</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Score</th>
              <th className="p-4 font-medium">AI Recommendation</th>
              <th className="p-4 font-medium">Human Review</th>
              <th className="p-4 font-medium">Strengths / Weaknesses</th>
              <th className="p-4 font-medium">Skill Breakdown</th>
              <th className="p-4 font-medium">Action</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t hover:bg-gray-50">
                <td className="p-4">
                  <p className="font-medium text-gray-900">
                    {item.candidate?.name ?? "Unknown"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.candidate?.email ?? ""}
                  </p>
                </td>

                <td className="p-4 text-gray-600">
                  {new Date(item.created_at).toLocaleDateString("en-IN", {
                    dateStyle: "medium",
                    timeZone: "Asia/Kolkata",
                  })}
                </td>

                <td className="p-4">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {item.status}
                  </span>
                </td>

                <td className="p-4">
                  {item.report?.overall_score != null ? (
                    <span className="font-semibold text-gray-900">
                      {item.report.overall_score}%
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">Pending</span>
                  )}
                </td>

                <td className="p-4">
                  <RecommendationBadge value={item.report?.recommendation} />
                  <p className="mt-0.5 text-xs text-gray-400">
                    AI suggestion – not final
                  </p>
                </td>

                <td className="p-4">
                  <div className="flex flex-col gap-2">
                    <ReviewBadge value={item.report?.human_review_status} />

                    {item.report && (
                      <HumanReviewButtons
                        interviewId={item.id}
                        currentDecision={
                          item.report.human_review_status
                        }
                      />
                    )}
                  </div>
                </td>

                <td className="p-4 max-w-xs">
                  {item.report ? (
                    <>
                      {(item.report.strengths ?? []).length > 0 && (
                        <div className="mb-1">
                          <span className="text-xs font-medium text-green-700">
                            Strengths:
                          </span>
                          <span className="ml-1 text-xs text-gray-600">
                            {(item.report.strengths ?? []).join(", ")}
                          </span>
                        </div>
                      )}
                      {(item.report.weaknesses ?? []).length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-red-700">
                            Weaknesses:
                          </span>
                          <span className="ml-1 text-xs text-gray-600">
                            {(item.report.weaknesses ?? []).join(", ")}
                          </span>
                        </div>
                      )}
                      {!(item.report.strengths ?? []).length &&
                        !(item.report.weaknesses ?? []).length && (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                    </>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>

                <td className="p-4">
                  <SkillBreakdown skills={item.skills} />
                </td>

                <td className="p-4">
                  {item.status === "Completed" && (
                    <EvaluateButton interviewId={item.id} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!rows.length && (
          <p className="p-6 text-gray-500">No interviews found.</p>
        )}
      </div>
    </div>
  );
}
export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading reports...</div>}>
      <ReportsContent />
    </Suspense>
  );
}