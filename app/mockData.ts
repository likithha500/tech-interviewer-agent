import { Candidate, Interview, Question, Report, DashboardStats } from './types';

export const dashboardStats: DashboardStats = {
  totalCandidates: 124,
  interviewsScheduled: 58,
  completedInterviews: 42,
  pendingEvaluations: 15,
};

export const recentCandidates: Candidate[] = [
  {
    id: 'c1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    applicationId: 'APP-001',
    status: 'Scheduled',
    registrationDate: '2023-09-12',
  },
  {
    id: 'c2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    applicationId: 'APP-002',
    status: 'Pending Evaluation',
    registrationDate: '2023-09-10',
  },
  {
    id: 'c3',
    name: 'Carol Lee',
    email: 'carol@example.com',
    applicationId: 'APP-003',
    status: 'Completed',
    registrationDate: '2023-09-08',
  },
];

export const recentInterviews: Interview[] = [
  {
    id: 'i1',
    candidateName: 'Alice Johnson',
    stages: ['HR', 'Technical', 'Manager'],
    progress: 40,
    status: 'In Progress',
  },
  {
    id: 'i2',
    candidateName: 'Bob Smith',
    stages: ['HR', 'Technical'],
    progress: 100,
    status: 'Completed',
  },
];

export const recentQuestions: Question[] = [
  {
    id: 'q1',
    category: 'Algorithms',
    topic: 'Sorting',
    difficulty: 'Medium',
    marks: 10,
  },
  {
    id: 'q2',
    category: 'System Design',
    topic: 'Scalability',
    difficulty: 'Hard',
    marks: 15,
  },
];

export const recentReports: Report[] = [
  {
    candidateName: 'Alice Johnson',
    totalScore: 85,
    skillScores: { Algorithms: 40, 'System Design': 45 },
    evaluationStatus: 'Reviewed',
    recommendation: 'Hire',
  },
  {
    candidateName: 'Bob Smith',
    totalScore: 70,
    skillScores: { Algorithms: 35, 'System Design': 35 },
    evaluationStatus: 'Pending',
    recommendation: 'Consider',
  },
];
