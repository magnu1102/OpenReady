import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ScoreCategory } from "@/modules/scoring-engine";

/** Allowed range for a user-configured category weight multiplier. */
export const MIN_CATEGORY_WEIGHT = 0;
export const MAX_CATEGORY_WEIGHT = 3;
export const DEFAULT_CATEGORY_WEIGHT = 1;

interface PreferencesState {
  /**
   * Per-category weight multipliers layered on top of the project-type profile
   * weights (see `mergeWeights` in analyzer-core). Absent categories default to 1.
   */
  categoryWeights: Partial<Record<ScoreCategory, number>>;
  setCategoryWeight: (category: ScoreCategory, weight: number) => void;
  resetWeights: () => void;
}

function clampWeight(weight: number): number {
  if (Number.isNaN(weight)) return DEFAULT_CATEGORY_WEIGHT;
  return Math.min(MAX_CATEGORY_WEIGHT, Math.max(MIN_CATEGORY_WEIGHT, weight));
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      categoryWeights: {},
      setCategoryWeight: (category, weight) =>
        set((state) => ({
          categoryWeights: { ...state.categoryWeights, [category]: clampWeight(weight) },
        })),
      resetWeights: () => set({ categoryWeights: {} }),
    }),
    { name: "openready-preferences" },
  ),
);
