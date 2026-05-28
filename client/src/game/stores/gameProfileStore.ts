import { create } from 'zustand';
import * as gameApi from '../api/gameApi';

interface GameProfile {
  id: string;
  userId: string;
  nickname: string;
  avatar: string;
  totalXP: number;
  level: number;
}

interface GameProfileState {
  profile: GameProfile | null;
  isLoading: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
  createProfile: (nickname: string, avatar: string) => Promise<void>;
  updateProfile: (data: { nickname?: string; avatar?: string }) => Promise<void>;
}

export const useGameProfileStore = create<GameProfileState>((set) => ({
  profile: null,
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await gameApi.getGameProfile();
      set({ profile: res.data?.profile ?? res.data, isLoading: false });
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 404) {
        set({ profile: null, isLoading: false });
      } else {
        set({ error: '加载失败', isLoading: false });
      }
    }
  },

  createProfile: async (nickname: string, avatar: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await gameApi.createGameProfile({ nickname, avatar });
      set({ profile: res.data?.profile ?? res.data, isLoading: false });
    } catch {
      set({ error: '创建失败', isLoading: false });
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await gameApi.updateGameProfile(data);
      set({ profile: res.data?.profile ?? res.data });
    } catch {
    }
  },
}));
