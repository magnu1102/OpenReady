import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCountUp } from "./useCountUp";

describe("useCountUp", () => {
  let now = 0;
  let rafCallbacks: FrameRequestCallback[] = [];

  beforeEach(() => {
    now = 0;
    rafCallbacks = [];
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
    // Default: no reduced motion.
    if (typeof window !== "undefined") {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: () => ({
          matches: false,
          addEventListener: () => {},
          removeEventListener: () => {},
        }),
      });
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function pump(elapsedMs: number) {
    now += elapsedMs;
    const callbacks = rafCallbacks;
    rafCallbacks = [];
    for (const cb of callbacks) cb(now);
  }

  it("returns null when target is null", () => {
    const { result } = renderHook(() => useCountUp(null));
    expect(result.current).toBeNull();
  });

  it("animates from 0 toward the target over the duration", () => {
    const { result } = renderHook(() => useCountUp(100, { duration: 600 }));
    expect(result.current).toBe(100); // initial render before first RAF fires

    act(() => pump(0)); // start frame
    expect(result.current).toBeGreaterThanOrEqual(0);
    expect(result.current).toBeLessThan(100);

    act(() => pump(700));
    expect(result.current).toBe(100);
  });

  it("short-circuits to the target when reduced motion is preferred", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({
        matches: true,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });

    const { result } = renderHook(() => useCountUp(82));
    expect(result.current).toBe(82);
  });
});
