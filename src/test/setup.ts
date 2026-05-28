import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  testStorage.clear();
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
