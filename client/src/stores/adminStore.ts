import { create } from 'zustand';
import { adminApi, type QueueStats, type JudgeHealth, type PlatformStats } from '../api/admin';
import { feedbackAdminApi } from '../api/admin';
import type { QuestionFeedback, FeedbackStats } from '../../../shared/src/types';

interface AdminState {
  adminKey: string | null;
  queueStats: QueueStats | null;
  health: JudgeHealth | null;
  stats: PlatformStats | null;
  loading: boolean;
  feedbackList: { items: QuestionFeedback[]; total: number; page: number; totalPages: number } | null;
  feedbackStats: FeedbackStats | null;
  feedbackLoading: boolean;
  setAdminKey: (key: string) => void;
  clearAdminKey: () => void;
  fetchQueueStats: () => Promise<void>;
  fetchHealth: () => Promise<void>;
  fetchStats: () => Promise<void>;
  setQueueStats: (stats: Partial<QueueStats>) => void;
  fetchFeedbackList: (params?: { page?: number; limit?: number; status?: string }) => Promise<void>;
  fetchFeedbackStats: () => Promise<void>;
  resolveFeedback: (id: string, data: { status: string; adminNote?: string }) => Promise<void>;
}

export const useAdminStore = create<AdminState>((set) => ({
  adminKey: localStorage.getItem('adminKey'),
  queueStats: null,
  health: null,
  stats: null,
  loading: false,
  feedbackList: null,
  feedbackStats: null,
  feedbackLoading: false,

  setAdminKey: (key: string) => {
    localStorage.setItem('adminKey', key);
    set({ adminKey: key });
  },

  clearAdminKey: () => {
    localStorage.removeItem('adminKey');
    set({ adminKey: null, queueStats: null, health: null, stats: null, feedbackList: null, feedbackStats: null });
  },

  fetchQueueStats: async () => {
    try {
      const res = await adminApi.getQueueStats();
      set({ queueStats: res.data });
    } catch {
      // silent fail
    }
  },

  fetchHealth: async () => {
    try {
      const res = await adminApi.getHealth();
      set({ health: res.data });
    } catch {
      // silent fail
    }
  },

  fetchStats: async () => {
    try {
      const res = await adminApi.getStats();
      set({ stats: res.data });
    } catch {
      // silent fail
    }
  },

  setQueueStats: (stats) => {
    set((s) => ({
      queueStats: s.queueStats ? { ...s.queueStats, ...stats } : (stats as QueueStats),
    }));
  },

  fetchFeedbackList: async (params?: { page?: number; limit?: number; status?: string }) => {
    set({ feedbackLoading: true });
    try {
      const res = await feedbackAdminApi.getFeedbacks(params);
      set({ feedbackList: res.data, feedbackLoading: false });
    } catch {
      set({ feedbackLoading: false });
    }
  },

  fetchFeedbackStats: async () => {
    try {
      const res = await feedbackAdminApi.getFeedbackStats();
      set({ feedbackStats: res.data });
    } catch {
      // silent
    }
  },

  resolveFeedback: async (id: string, data: { status: string; adminNote?: string }) => {
    await feedbackAdminApi.resolveFeedback(id, data);
  },
}));
