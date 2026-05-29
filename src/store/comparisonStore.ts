import { create } from "zustand";

/** Maximum number of repositories that can be compared side by side at once. */
export const MAX_COMPARISON = 3;

interface ComparisonState {
  selectedIds: string[];
  /** Add or remove a repository from the selection (no-op to add when full). */
  toggle: (repositoryId: string) => void;
  clear: () => void;
}

export const useComparisonStore = create<ComparisonState>((set) => ({
  selectedIds: [],
  toggle: (repositoryId) =>
    set((state) => {
      if (state.selectedIds.includes(repositoryId)) {
        return { selectedIds: state.selectedIds.filter((id) => id !== repositoryId) };
      }
      if (state.selectedIds.length >= MAX_COMPARISON) return state;
      return { selectedIds: [...state.selectedIds, repositoryId] };
    }),
  clear: () => set({ selectedIds: [] }),
}));
