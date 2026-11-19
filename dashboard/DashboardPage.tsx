
import "server-only";

import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileText,
  ShieldCheck,
  Users,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type CandidateRow = {
  id: string;
  name: string | null;
  email: string | null;
  created_at: string | null;
};

type InterviewRow = {
  id: string;
  candidate_id: string | null;
  status: string | null;
  created_at: string | null;
};

type QuestionRow = {
  id: string;
  category: string | null;
  topic: string | null;
  difficulty: string | null;
  marks: number | null;
};

type ReportRow = {
  interview_id: string;
  overall_score: number | null;
  recommendation: string | null;
  human_review_status: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function StatusBadge({
  value,
}: {
  value: string | null | undefined;
}) {
  const status = value || "Unknown";
  const normalized = status.toLowerCase();

  let colors = "bg-slate-100 text-slate-700";

  if (
    normalized === "completed" ||
    normalized === "approved" ||
    normalized === "hire"
  ) {
    colors = "bg-emerald-50 text-emerald-700";
  } else if (
    normalized === "rejected" ||
    normalized === "reject" ||
    normalized === "failed"
  ) {
    colors = "bg-rose-50 text-rose-700";
  } else if (
    normalized.includes("pending") ||
    normalized === "hold" ||
    normalized === "scheduled"
  ) {
    colors = "bg-amber-50 text-amber-700";
  } else if (
    normalized.includes("progress") ||
    normalized === "active"
  ) {
    colors = "bg-blue-50 text-blue-700";
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colors}`}
    >
      {status}
    </span>
  );
}

function SectionHeading({
  title,
  description,
  href,
  linkText,
}: {
  title: string;
  description: string;
  href: string;
  linkText: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      <Link
        href={href}
        prefetch={false}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 transition hover:text-indigo-800"
      >
        {linkText}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-5 py-10 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

async function DashboardContent() {
  // Required for dynamic data in the Next.js app router.
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="rounded-xl bg-white p-8 text-center text-slate-600">
        Please sign in to view the dashboard.
      </div>
    );
  }

  const admin = createAdminClient();

  // Fetch live data from the same Supabase tables used
  // by the working reports page.
  const [
    candidatesResult,
    interviewsResult,
    questionsResult,
    reportsResult,
  ] = await Promise.all([
    admin
      .from("candidates")
      .select("id, name, email, created_at")
      .order("created_at", { ascending: false }),

    admin
      .from("interviews")
      .select("id, candidate_id, status, created_at")
      .order("created_at", { ascending: false }),

    admin
      .from("questions")
      .select("id, category, topic, difficulty, marks")
      .limit(100),

    admin
      .from("reports")
      .select(
        "interview_id, overall_score, recommendation, human_review_status"
      ),
  ]);

  const errors = [
    candidatesResult.error,
    interviewsResult.error,
    questionsResult.error,
    reportsResult.error,
  ].filter((error) => error !== null);

  if (errors.length > 0) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-bold text-red-800">
          Dashboard data could not be loaded
        </h2>
        <p className="mt-2 text-sm text-red-700">
          {errors.map((error) => error.message).join(" | ")}
        </p>
      </div>
    );
  }

  const candidates =
    (candidatesResult.data ?? []) as CandidateRow[];

  const interviews =
    (interviewsResult.data ?? []) as InterviewRow[];

  const questions =
    (questionsResult.data ?? []) as QuestionRow[];

  const reports =
    (reportsResult.data ?? []) as ReportRow[];

  const candidateMap = new Map(
    candidates.map((candidate) => [
      candidate.id,
      candidate,
    ])
  );

  const reportMap = new Map(
    reports.map((report) => [
      report.interview_id,
      report,
    ])
  );

  const totalCandidates = candidates.length;

  const totalInterviews = interviews.length;

  const completedInterviews = interviews.filter(
    (interview) =>
      interview.status?.toLowerCase() === "completed"
  ).length;

  const pendingEvaluations = interviews.filter(
    (interview) =>
      interview.status?.toLowerCase() === "completed" &&
      !reportMap.has(interview.id)
  ).length;

  const pendingHumanReviews = interviews.filter(
    (interview) => {
      const report = reportMap.get(interview.id);

      return (
        !!report &&
        (!report.human_review_status ||
          report.human_review_status.toLowerCase() ===
          "pending")
      );
    }
  ).length;

  const scoredReports = reports.filter(
    (report) =>
      report.overall_score !== null &&
      Number.isFinite(report.overall_score)
  );

  const averageScore =
    scoredReports.length > 0
      ? Math.round(
        scoredReports.reduce(
          (sum, report) =>
            sum + (report.overall_score ?? 0),
          0
        ) / scoredReports.length
      )
      : null;

  const statCards = [
    {
      label: "Total Candidates",
      value: totalCandidates.toString(),
      description: "Registered candidates",
      icon: Users,
      iconColor: "text-indigo-600",
      iconBackground: "bg-indigo-50",
    },
    {
      label: "Total Interviews",
      value: totalInterviews.toString(),
      description: "All interview records",
      icon: BriefcaseBusiness,
      iconColor: "text-blue-600",
      iconBackground: "bg-blue-50",
    },
    {
      label: "Completed Interviews",
      value: completedInterviews.toString(),
      description: "Finished interviews",
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      iconBackground: "bg-emerald-50",
    },
    {
      label: "Pending Evaluations",
      value: pendingEvaluations.toString(),
      description: "Completed without reports",
      icon: Clock3,
      iconColor: "text-amber-600",
      iconBackground: "bg-amber-50",
    },
  ];

  const recentCandidates = candidates.slice(0, 5);
  const recentInterviews = interviews.slice(0, 5);

  const recentReports = interviews
    .filter((interview) => reportMap.has(interview.id))
    .slice(0, 5);

  const recentQuestions = questions.slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Dashboard header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <Activity className="h-3.5 w-3.5" />
              Live Supabase Data
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Interview Dashboard
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Monitor candidates, interviews, AI evaluations,
              and human review decisions.
            </p>
          </div>

          <Link
            href="/reports"
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <FileText className="h-4 w-4" />
            View Scorecards
          </Link>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {card.label}
                    </p>

                    <p className="mt-3 text-3xl font-extrabold text-slate-900">
                      {card.value}
                    </p>
                  </div>

                  <div
                    className={`rounded-xl p-3 ${card.iconBackground}`}
                  >
                    <Icon
                      className={`h-5 w-5 ${card.iconColor}`}
                    />
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-400">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm font-medium">
                Average AI Score
              </span>
            </div>

            <p className="mt-3 text-3xl font-bold text-slate-900">
              {averageScore === null
                ? "—"
                : `${averageScore}%`}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              Based on generated reports
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-sm font-medium">
                Pending Human Reviews
              </span>
            </div>

            <p className="mt-3 text-3xl font-bold text-slate-900">
              {pendingHumanReviews}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              Reports awaiting final review
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">
                Generated Reports
              </span>
            </div>

            <p className="mt-3 text-3xl font-bold text-slate-900">
              {reports.length}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              AI evaluation scorecards
            </p>
          </div>
        </div>

        {/* Recent candidates */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <SectionHeading
              title="Recent Candidates"
              description="Latest registered candidates from Supabase"
              href="/candidates"
              linkText="View all"
            />
          </div>

          {recentCandidates.length === 0 ? (
            <EmptyState message="No candidates registered yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">
                      Candidate
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Email
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Registered
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {recentCandidates.map((candidate) => (
                    <tr
                      key={candidate.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {candidate.name || "Unnamed Candidate"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {candidate.email || "—"}
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {formatDate(candidate.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent interviews */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <SectionHeading
              title="Recent Interviews"
              description="Track real interview activity"
              href="/interviews"
              linkText="View all"
            />
          </div>

          {recentInterviews.length === 0 ? (
            <EmptyState message="No interviews found." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">
                      Candidate
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Date
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Status
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      AI Score
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {recentInterviews.map((interview) => {
                    const candidate = interview.candidate_id
                      ? candidateMap.get(interview.candidate_id)
                      : null;

                    const report = reportMap.get(interview.id);

                    return (
                      <tr
                        key={interview.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {candidate?.name || "Unknown Candidate"}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {candidate?.email || ""}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatDate(interview.created_at)}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge value={interview.status} />
                        </td>

                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {report?.overall_score != null
                            ? `${report.overall_score}%`
                            : "Pending"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent reports */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <SectionHeading
              title="Recent Reports"
              description="AI recommendations and final human review"
              href="/reports"
              linkText="View scorecards"
            />
          </div>

          {recentReports.length === 0 ? (
            <EmptyState message="No evaluation reports generated yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">
                      Candidate
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Score
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      AI Recommendation
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Human Review
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {recentReports.map((interview) => {
                    const candidate = interview.candidate_id
                      ? candidateMap.get(interview.candidate_id)
                      : null;

                    const report = reportMap.get(interview.id)!;

                    return (
                      <tr
                        key={interview.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {candidate?.name || "Unknown Candidate"}
                        </td>

                        <td className="px-5 py-4 font-bold text-slate-900">
                          {report.overall_score != null
                            ? `${report.overall_score}%`
                            : "—"}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            value={report.recommendation}
                          />
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            value={
                              report.human_review_status ||
                              "Pending"
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Question bank */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <SectionHeading
              title="Question Bank"
              description="Technical questions available for interviews"
              href="/questions"
              linkText="Browse questions"
            />
          </div>

          {recentQuestions.length === 0 ? (
            <EmptyState message="No questions available." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">
                      Category
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Topic
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Difficulty
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Marks
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {recentQuestions.map((question) => (
                    <tr
                      key={question.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {question.category || "—"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {question.topic || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          value={question.difficulty}
                        />
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {question.marks ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />

            <div>
              <p className="text-sm font-semibold text-indigo-900">
                Human-in-the-loop evaluation
              </p>

              <p className="mt-1 text-sm leading-6 text-indigo-700">
                AI-generated scores and hiring recommendations
                are advisory. Final hiring decisions require
                human review.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 p-8 text-slate-500">
          Loading live dashboard...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

