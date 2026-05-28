import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TourState {
  seen: boolean;
  activeStep: number | null;
  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  restart: () => void;
  setStep: (index: number) => void;
}

export const TOUR_STEP_COUNT = 4;

export const useTourStore = create<TourState>()(
  persist(
    (set, get) => ({
      seen: false,
      activeStep: null,
      start: () => {
        if (get().activeStep !== null) return;
        set({ activeStep: 0 });
      },
      next: () => {
        const current = get().activeStep;
        if (current === null) return;
        const nextIndex = current + 1;
        if (nextIndex >= TOUR_STEP_COUNT) {
          set({ activeStep: null, seen: true });
          return;
        }
        set({ activeStep: nextIndex });
      },
      prev: () => {
        const current = get().activeStep;
        if (current === null || current === 0) return;
        set({ activeStep: current - 1 });
      },
      skip: () => {
        set({ activeStep: null, seen: true });
      },
      restart: () => {
        set({ activeStep: 0, seen: false });
      },
      setStep: (index) => {
        if (index < 0 || index >= TOUR_STEP_COUNT) return;
        set({ activeStep: index });
      },
    }),
    {
      name: "openready-tour",
      partialize: (state) => ({ seen: state.seen }),
    },
  ),
);
