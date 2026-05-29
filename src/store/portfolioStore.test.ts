import { beforeEach, describe, expect, it } from "vitest";
import { usePortfolioStore } from "./portfolioStore";

beforeEach(() => {
  usePortfolioStore.getState().reset();
});

describe("portfolioStore", () => {
  it("defaults to auto role with no overrides", () => {
    expect(usePortfolioStore.getState().role).toBe("auto");
    expect(usePortfolioStore.getState().overrides).toEqual({});
  });

  it("sets an explicit role", () => {
    usePortfolioStore.getState().setRole("backend");
    expect(usePortfolioStore.getState().role).toBe("backend");
  });

  it("cycles togglePin through include -> exclude -> auto", () => {
    const { togglePin } = usePortfolioStore.getState();
    togglePin("r1");
    expect(usePortfolioStore.getState().overrides.r1).toBe(true);
    togglePin("r1");
    expect(usePortfolioStore.getState().overrides.r1).toBe(false);
    togglePin("r1");
    expect("r1" in usePortfolioStore.getState().overrides).toBe(false);
  });

  it("sets and clears a single override", () => {
    const { setOverride } = usePortfolioStore.getState();
    setOverride("r2", false);
    expect(usePortfolioStore.getState().overrides.r2).toBe(false);
    setOverride("r2", null);
    expect("r2" in usePortfolioStore.getState().overrides).toBe(false);
  });

  it("resets role and overrides", () => {
    usePortfolioStore.getState().setRole("devops");
    usePortfolioStore.getState().togglePin("r3");
    usePortfolioStore.getState().reset();
    expect(usePortfolioStore.getState().role).toBe("auto");
    expect(usePortfolioStore.getState().overrides).toEqual({});
  });
});
