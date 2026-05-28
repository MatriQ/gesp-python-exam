import { create } from 'zustand';
import { gameApi } from '../api/gameApi';

interface StoryChapter {
  id: string;
  level: number;
  chapterIndex: number;
  title: string;
}

interface StoryProgressItem {
  chapterId: string;
  currentScene: number;
  completed: boolean;
}

interface StoryState {
  chapters: StoryChapter[];
  progress: StoryProgressItem[];
  currentChapterId: string | null;
  currentScene: number;
  isLoading: boolean;
  fetchChapters: (level?: number) => Promise<void>;
  fetchProgress: () => Promise<void>;
  setCurrentChapter: (chapterId: string | null) => void;
  setCurrentScene: (scene: number) => void;
}

export const useGameStoryStore = create<StoryState>((set) => ({
  chapters: [],
  progress: [],
  currentChapterId: null,
  currentScene: 0,
  isLoading: false,

  fetchChapters: async (level) => {
    set({ isLoading: true });
    try {
      const res = await gameApi.getStoryChapters(level);
      set({ chapters: res.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchProgress: async () => {
    try {
      const res = await gameApi.getStoryProgress();
      set({ progress: res.data });
    } catch {
      /* intentionally silent */
    }
  },

  setCurrentChapter: (chapterId) => set({ currentChapterId: chapterId, currentScene: 0 }),
  setCurrentScene: (scene) => set({ currentScene: scene }),
}));
