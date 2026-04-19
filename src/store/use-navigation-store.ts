import { create } from 'zustand';

export type NavigationType = 'bar' | 'spinner';

interface NavigationState {
  isNavigating: boolean;
  progress: number;
  type: NavigationType;

  start: (type: NavigationType) => void;
  setProgress: (progress: number) => void;
  complete: () => void;
  reset: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  isNavigating: false,
  progress: 0,
  type: 'bar',

  start: (type) => set({ isNavigating: true, progress: 0, type }),

  setProgress: (progress) =>
    set((state) => ({
      progress: Math.max(state.progress, progress),
    })),

  complete: () => set({ progress: 100 }),

  reset: () => set({ isNavigating: false, progress: 0, type: 'bar' }),
}));
