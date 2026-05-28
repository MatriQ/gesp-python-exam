import { create } from 'zustand';
import { gameApi } from '../api/gameApi';

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

interface AchievementState {
  achievements: Achievement[];
  isLoading: boolean;
  newlyUnlocked: Achievement | null;
  fetchAchievements: () => Promise<void>;
  setNewlyUnlocked: (achievement: Achievement | null) => void;
}

export const useAchievementStore = create<AchievementState>((set) => ({
  achievements: [],
  isLoading: false,
  newlyUnlocked: null,

  fetchAchievements: async () => {
    set({ isLoading: true });
    try {
      const res = await gameApi.getAchievements();
      set({ achievements: res.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setNewlyUnlocked: (achievement) => set({ newlyUnlocked: achievement }),
}));
