import { create } from 'zustand';
import { gameApi } from '../api/gameApi';

interface Stage {
  id: string;
  level: number;
  stageIndex: number;
  title: string;
  type: string;
  questionCount: number;
  timeLimit: number | null;
}

interface StageProgress {
  id: string;
  stageId: string;
  status: string;
  stars: number;
  bestScore: number | null;
  attempts: number;
}

interface GameState {
  currentLevel: number;
  stages: Stage[];
  stageProgress: StageProgress[];
  currentStageId: string | null;
  gameState: 'idle' | 'playing' | 'completed';
  isLoading: boolean;
  setCurrentLevel: (level: number) => void;
  fetchStages: (level: number) => Promise<void>;
  setCurrentStage: (stageId: string | null) => void;
  setGameState: (state: 'idle' | 'playing' | 'completed') => void;
  resetGame: () => void;
}

export const useGameMapStore = create<GameState>((set) => ({
  currentLevel: 1,
  stages: [],
  stageProgress: [],
  currentStageId: null,
  gameState: 'idle',
  isLoading: false,

  setCurrentLevel: (level) => set({ currentLevel: level }),

  fetchStages: async (level) => {
    set({ isLoading: true });
    try {
      const [stagesRes, progressRes] = await Promise.all([
        gameApi.getStagesByLevel(level),
        gameApi.getStageProgress(level),
      ]);
      set({
        stages: stagesRes.data.stages ?? stagesRes.data,
        stageProgress: progressRes.data,
        currentLevel: level,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  setCurrentStage: (stageId) => set({ currentStageId: stageId }),
  setGameState: (state) => set({ gameState: state }),
  resetGame: () => set({ currentStageId: null, gameState: 'idle' }),
}));
