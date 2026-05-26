import { create } from 'zustand';

interface AppState {
  selectedLevel: number;
  setSelectedLevel: (level: number) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedLevel: 1,
  setSelectedLevel: (level: number) => set({ selectedLevel: level }),
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
