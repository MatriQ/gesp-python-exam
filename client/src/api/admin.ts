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

// Feedback admin client (separate baseURL since feedback routes are at /api/feedback)
const feedbackAdminClient = axios.create({
  baseURL: '/api/feedback',
});

feedbackAdminClient.interceptors.request.use((config) => {
  const key = localStorage.getItem('adminKey');
  if (key) {
    config.headers['x-admin-key'] = key;
  }
  return config;
});

export const feedbackAdminApi = {
  getFeedbacks: (params?: { page?: number; limit?: number; status?: string }) =>
    feedbackAdminClient.get<import('../../../shared/src/types').FeedbackListResponse>('/', { params }),
  getFeedback: (id: string) =>
    feedbackAdminClient.get<{ feedback: import('../../../shared/src/types').QuestionFeedback }>('/' + id),
  resolveFeedback: (id: string, data: { status: string; adminNote?: string }) =>
    feedbackAdminClient.patch<{ feedback: import('../../../shared/src/types').QuestionFeedback }>('/' + id, data),
  getFeedbackStats: () =>
    feedbackAdminClient.get<import('../../../shared/src/types').FeedbackStats>('/stats'),
};

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  _count: { userAnswers: number; codeSubmissions: number; mockExams: number };
  gameProfile: { nickname: string; avatar: string; totalXP: number; level: number } | null;
  answerStats: { total: number; correct: number };
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AdminQuestion {
  id: string;
  session: string;
  level: number;
  type: string;
  questionIndex: number;
  questionText: string;
  answer: string | null;
  topics: string[];
  difficulty: string | null;
  createdAt: string;
  _count: { userAnswers: number; codeSubmissions: number; feedbacks: number };
}

export interface AdminQuestionsResponse {
  questions: AdminQuestion[];
  total: number;
  page: number;
  totalPages: number;
}

export interface QuestionDistribution {
  distribution: Array<{ level: number; type: string; count: number }>;
  pendingFeedback: number;
}

export const adminUsersApi = {
  getUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    adminClient.get<AdminUsersResponse>('/users', { params }),
  getUser: (id: string) =>
    adminClient.get('/users/' + id),
};

export const adminQuestionsApi = {
  getQuestions: (params?: { page?: number; limit?: number; level?: number; type?: string; search?: string }) =>
    adminClient.get<AdminQuestionsResponse>('/questions', { params }),
  getQuestionStats: () =>
    adminClient.get<QuestionDistribution>('/questions/stats'),
  getQuestion: (id: string) =>
    adminClient.get('/questions/' + id),
};
