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
