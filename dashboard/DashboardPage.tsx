
import Link from 'next/link';
import { BarChart2, Users, Briefcase, FileText } from 'lucide-react';
import Table from '@/components/Table';
import { Candidate, Interview, Question, Report } from '@/types';
import {
  dashboardStats,
  recentCandidates,
  recentInterviews,
  recentQuestions,
  recentReports,
} from '@/mockData';

const statCards = [
  { label: 'Total Candidates', value: dashboardStats.totalCandidates, icon: Users },
  { label: 'Interviews Scheduled', value: dashboardStats.interviewsScheduled, icon: Briefcase },
  { label: 'Completed Interviews', value: dashboardStats.completedInterviews, icon: BarChart2 },
  { label: 'Pending Evaluations', value: dashboardStats.pendingEvaluations, icon: FileText },
];

export default function DashboardPage() {
  const candidateColumns = [
    { header: 'Name', accessor: 'name' as keyof Candidate },
    { header: 'Email', accessor: 'email' as keyof Candidate },
    { header: 'Application ID', accessor: 'applicationId' as keyof Candidate },
    { header: 'Status', accessor: 'status' as keyof Candidate },
    { header: 'Registered', accessor: 'registrationDate' as keyof Candidate },
  ];

  const interviewColumns = [
    { header: 'Candidate', accessor: 'candidateName' as keyof Interview },
    { header: 'Progress', accessor: 'progress' as keyof Interview },
    { header: 'Status', accessor: 'status' as keyof Interview },
  ];

  const questionColumns = [
    { header: 'Category', accessor: 'category' as keyof Question },
    { header: 'Topic', accessor: 'topic' as keyof Question },
    { header: 'Difficulty', accessor: 'difficulty' as keyof Question },
    { header: 'Marks', accessor: 'marks' as keyof Question },
  ];

  const reportColumns = [
    { header: 'Candidate', accessor: 'candidateName' as keyof Report },
    { header: 'Total Score', accessor: 'totalScore' as keyof Report },
    { header: 'Evaluation', accessor: 'evaluationStatus' as keyof Report },
    { header: 'Recommendation', accessor: 'recommendation' as keyof Report },
  ];

  return (
    <div className="space-y-8">
      {/* Dashboard statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="flex items-center rounded-lg bg-white p-4 shadow"
          >
            <card.icon className="mr-3 h-6 w-6 text-primary" />
            <div>
              <div className="text-2xl font-bold text-gray-800">
                {card.value}
              </div>
              <div className="text-sm text-gray-600">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent candidates */}
      <section>
        <h2 className="mb-2 text-xl font-semibold text-primary">
          Recent Candidates
        </h2>
        <Table columns={candidateColumns} data={recentCandidates} />
        <Link
          href="/candidates"
          prefetch={false}
          className="mt-2 inline-block text-primary underline"
        >
          View all candidates
        </Link>
      </section>

      {/* Recent interviews */}
      <section>
        <h2 className="mb-2 text-xl font-semibold text-primary">
          Recent Interviews
        </h2>
        <Table columns={interviewColumns} data={recentInterviews} />
        <Link
          href="/interviews"
          prefetch={false}
          className="mt-2 inline-block text-primary underline"
        >
          View all interviews
        </Link>
      </section>

      {/* Recent questions */}
      <section>
        <h2 className="mb-2 text-xl font-semibold text-primary">
          Recent Questions
        </h2>
        <Table columns={questionColumns} data={recentQuestions} />
        <Link
          href="/questions"
          prefetch={false}
          className="mt-2 inline-block text-primary underline"
        >
          Browse question bank
        </Link>
      </section>

      {/* Recent reports */}
      <section>
        <h2 className="mb-2 text-xl font-semibold text-primary">
          Recent Reports
        </h2>
        <Table columns={reportColumns} data={recentReports} />
        <Link
          href="/reports"
          prefetch={false}
          className="mt-2 inline-block text-primary underline"
        >
          View all reports
        </Link>
      </section>
    </div>
  );
}

