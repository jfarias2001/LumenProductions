import { create } from 'zustand';

interface UIState {
  openCardId: string | null;
  boardFilters: {
    assigneeId?: string;
    pillar?: string;
    awareness?: string;
    contentClass?: string;
    search?: string;
  };
  setOpenCard: (id: string | null) => void;
  setFilter: (key: string, value: string | undefined) => void;
  clearFilters: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  openCardId: null,
  boardFilters: {},

  setOpenCard: (id) => set({ openCardId: id }),

  setFilter: (key, value) =>
    set((state) => ({
      boardFilters: { ...state.boardFilters, [key]: value },
    })),

  clearFilters: () => set({ boardFilters: {} }),
}));
