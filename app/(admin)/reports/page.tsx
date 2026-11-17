import Table from '@/components/Table';
import { Report } from '@/types';
import { recentReports } from '@/mockData';

export default function ReportsPage() {
  const columns = [
    { header: 'Candidate', accessor: 'candidateName' as keyof Report },
    { header: 'Total Score', accessor: 'totalScore' as keyof Report },
    { header: 'Evaluation Status', accessor: 'evaluationStatus' as keyof Report },
    { header: 'Recommendation', accessor: 'recommendation' as keyof Report },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-semibold mb-4 text-primary">Reports & Scorecards</h1>
      <Table columns={columns} data={recentReports} />
    </div>
  );
}
