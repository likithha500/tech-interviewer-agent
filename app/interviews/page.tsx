import type { NextPage } from 'next';
import Table from '@/components/Table';
import { Interview } from '@/types';
import { recentInterviews } from '@/mockData';

const columns = [
  { header: 'Candidate', accessor: 'candidateName' as keyof Interview },
  { header: 'Progress', accessor: 'progress' as keyof Interview },
  { header: 'Status', accessor: 'status' as keyof Interview },
];

const InterviewsPage: NextPage = () => (
  <div className="p-6 bg-white rounded shadow">
    <h1 className="text-2xl font-semibold mb-4 text-primary">Interviews</h1>
    <Table columns={columns} data={recentInterviews} />
  </div>
);

export default InterviewsPage;
