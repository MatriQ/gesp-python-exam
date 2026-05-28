import axios from 'axios';

const adminClient = axios.create({
  baseURL: '/api/admin',
});

adminClient.interceptors.request.use((config) => {
  const key = localStorage.getItem('adminKey');
  if (key) {
    config.headers['x-admin-key'] = key;
  }
  return config;
});

export interface QueueStats {
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  delayed: number;
  recentCompleted: number;
  recentFailed: number;
  avgExecutionTimeMs: number;
}

export interface JudgeHealth {
  judge: { status: string; latency: number };
  redis: { status: string };
  lastProcessedAt: string | null;
}

export interface SubmissionUser {
  id: string;
  name: string;
  email: string;
}

export interface SubmissionQuestion {
  id: string;
  questionIndex: number;
  level: number;
  session: string;
  type: string;
}

export interface SubmissionListItem {
  id: string;
  userId: string;
  questionId: string;
  code: string;
  language: string;
  status: string;
  stdout: string | null;
  stderr: string | null;
  executionTimeMs: number | null;
  memoryUsedKb: number | null;
  testResults: unknown;
  createdAt: string;
  user: SubmissionUser;
  question: SubmissionQuestion;
}

export interface SubmissionsResponse {
  submissions: SubmissionListItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PlatformStats {
  totalUsers: number;
  totalSubmissions: number;
  statusBreakdown: Array<{ status: string; count: number }>;
  acceptanceRate: number;
  hourlySubmissions: Array<{ hour: string; count: number; accepted: number }>;
}

export const adminApi = {
  getQueueStats: () => adminClient.get<QueueStats>('/judge/queue'),
  getHealth: () => adminClient.get<JudgeHealth>('/judge/health'),
  getSubmissions: (params?: { page?: number; limit?: number; status?: string; userId?: string }) =>
    adminClient.get<SubmissionsResponse>('/submissions', { params }),
  getSubmission: (id: string) =>
    adminClient.get<{ submission: SubmissionListItem }>('/submissions/' + id),
  getStats: () => adminClient.get<PlatformStats>('/stats'),
  retrySubmission: (id: string) => adminClient.post('/judge/retry/' + id),
};
