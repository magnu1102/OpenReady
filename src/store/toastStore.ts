import { create } from "zustand";

export type ToastTone = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (tone: ToastTone, message: string) => number;
  dismiss: (id: number) => void;
  clear: () => void;
}

const MAX_VISIBLE = 3;
let nextId = 1;

/**
 * Toasts announce events (export saved, key stored, cache cleared) — never
 * persistent state, which stays inline in its screen. The viewport renders a
 * permanent aria-live region; auto-dismiss timing lives in the Toast
 * component so hover can pause it.
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (tone, message) => {
    const id = nextId++;
    set((state) => ({
      toasts: [...state.toasts, { id, tone, message }].slice(-MAX_VISIBLE),
    }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

/** Imperative API for non-React call sites (async handlers, store actions). */
export const toast = {
  success: (message: string) => useToastStore.getState().push("success", message),
  error: (message: string) => useToastStore.getState().push("error", message),
  info: (message: string) => useToastStore.getState().push("info", message),
};
