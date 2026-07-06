import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(async () => {
  cleanup();
  testStorage.clear();
  // Reset in-memory zustand stores so tests don't leak state through each other.
  // Imports are dynamic so the localStorage mock below is in place before any
  // zustand persist middleware initializes.
  const { useTourStore } = await import("@/modules/tour");
  const { useRepositoryStore } = await import("@/store/repositoryStore");
  const { useToastStore } = await import("@/store/toastStore");
  // Default: pretend the tour has been seen so auto-start does not
  // intercept other route-level integration tests. Tour-specific tests
  // override this via setState in their own setup.
  useTourStore.setState({ seen: true, activeStep: null });
  useRepositoryStore.getState().reset();
  useToastStore.getState().clear();
});

const testStorage = new Map<string, string>();

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => testStorage.get(key) ?? null,
      setItem: (key: string, value: string) => testStorage.set(key, value),
      removeItem: (key: string) => testStorage.delete(key),
      clear: () => testStorage.clear(),
      key: (index: number) => Array.from(testStorage.keys())[index] ?? null,
      get length() {
        return testStorage.size;
      },
    },
  });
}
