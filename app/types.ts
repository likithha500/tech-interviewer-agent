export interface Candidate {
  id: string;
  name: string;
  email: string;
  applicationId: string;
  status: 'Scheduled' | 'Completed' | 'Pending Evaluation';
  registrationDate: string; // ISO date
}

export interface Interview {
  id: string;
  candidateName: string;
  stages: string[];
  progress: number; // 0-100
  status: 'In Progress' | 'Completed' | 'Pending';
}

export interface Question {
  id: string;
  category: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  marks: number;
  question?: string;
  expected_answer?: string | null;
  time_complexity?: string | null;
  space_complexity?: string | null;
  evaluation_criteria?: Record<string, unknown> | null;
  test_cases?: unknown[] | null;
  is_active?: boolean;
  created_at?: string;
}

export interface QuestionDetails {
  id: string;
  category: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  question: string;
  expected_answer: string | null;
  time_complexity?: string | null;
  space_complexity?: string | null;
  evaluation_criteria?: Record<string, unknown> | null;
  test_cases?: unknown[] | null;
  marks: number;
  is_active?: boolean;
  created_at?: string;
}

export interface Report {
  candidateName: string;
  totalScore: number;
  skillScores: Record<string, number>;
  evaluationStatus: 'Reviewed' | 'Pending';
  recommendation: 'Hire' | 'No Hire' | 'Consider';
}

export interface DashboardStats {
  totalCandidates: number;
  interviewsScheduled: number;
  completedInterviews: number;
  pendingEvaluations: number;
}
