import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RoleId } from "@/modules/portfolio";

/** "auto" means "use suggestRole"; any RoleId pins an explicit target role. */
export type RoleSelection = RoleId | "auto";

interface PortfolioState {
  role: RoleSelection;
  /** Per-repo featured overrides: true = pinned in, false = pinned out. */
  overrides: Record<string, boolean>;
  setRole: (role: RoleSelection) => void;
  /** Cycle a repo through include -> exclude -> auto. */
  togglePin: (repositoryId: string) => void;
  setOverride: (repositoryId: string, include: boolean | null) => void;
  reset: () => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
      role: "auto",
      overrides: {},
      setRole: (role) => set({ role }),
      togglePin: (repositoryId) =>
        set((state) => {
          const current = state.overrides[repositoryId];
          const overrides = { ...state.overrides };
          if (current === undefined) {
            overrides[repositoryId] = true; // auto -> force in
          } else if (current === true) {
            overrides[repositoryId] = false; // force in -> force out
          } else {
            delete overrides[repositoryId]; // force out -> back to auto
          }
          return { overrides };
        }),
      setOverride: (repositoryId, include) =>
        set((state) => {
          const overrides = { ...state.overrides };
          if (include === null) {
            delete overrides[repositoryId];
          } else {
            overrides[repositoryId] = include;
          }
          return { overrides };
        }),
      reset: () => set({ role: "auto", overrides: {} }),
    }),
    { name: "openready-portfolio" },
  ),
);
