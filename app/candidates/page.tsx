import type { NextPage } from 'next';
import Table from '@/components/Table';
import { Candidate } from '@/types';
import { recentCandidates } from '@/mockData';

const columns = [
  { header: 'Name', accessor: 'name' as keyof Candidate },
  { header: 'Email', accessor: 'email' as keyof Candidate },
  { header: 'Application ID', accessor: 'applicationId' as keyof Candidate },
  { header: 'Status', accessor: 'status' as keyof Candidate },
  { header: 'Registered', accessor: 'registrationDate' as keyof Candidate },
];

const CandidatesPage: NextPage = () => (
  <div className="p-6 bg-white rounded shadow">
    <h1 className="text-2xl font-semibold mb-4 text-primary">Candidates</h1>
    <Table columns={columns} data={recentCandidates} />
  </div>
);

export default CandidatesPage;
