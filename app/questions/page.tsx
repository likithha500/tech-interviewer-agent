import Table from '@/components/Table';
import { Question } from '@/types';
import { recentQuestions } from '@/mockData';

export default function QuestionsPage() {
  const columns = [
    { header: 'Category', accessor: 'category' as keyof Question },
    { header: 'Topic', accessor: 'topic' as keyof Question },
    { header: 'Difficulty', accessor: 'difficulty' as keyof Question },
    { header: 'Marks', accessor: 'marks' as keyof Question },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-semibold mb-4 text-primary">Question Bank</h1>
      <Table columns={columns} data={recentQuestions} />
    </div>
  );
}
