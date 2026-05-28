import { create } from 'zustand';
import { adminApi, type QueueStats, type JudgeHealth, type PlatformStats } from '../api/admin';

interface AdminState {
  adminKey: string | null;
  queueStats: QueueStats | null;
  health: JudgeHealth | null;
  stats: PlatformStats | null;
  loading: boolean;
  setAdminKey: (key: string) => void;
  clearAdminKey: () => void;
  fetchQueueStats: () => Promise<void>;
  fetchHealth: () => Promise<void>;
  fetchStats: () => Promise<void>;
  setQueueStats: (stats: Partial<QueueStats>) => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  adminKey: localStorage.getItem('adminKey'),
  queueStats: null,
  health: null,
  stats: null,
  loading: false,

  setAdminKey: (key: string) => {
    localStorage.setItem('adminKey', key);
    set({ adminKey: key });
  },

  clearAdminKey: () => {
    localStorage.removeItem('adminKey');
    set({ adminKey: null, queueStats: null, health: null, stats: null });
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
}));
