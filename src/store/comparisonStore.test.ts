import { beforeEach, describe, expect, it } from "vitest";
import { MAX_COMPARISON, useComparisonStore } from "./comparisonStore";

beforeEach(() => {
  useComparisonStore.getState().clear();
});

describe("comparisonStore", () => {
  it("adds and removes ids with toggle", () => {
    const { toggle } = useComparisonStore.getState();
    toggle("a");
    toggle("b");
    expect(useComparisonStore.getState().selectedIds).toEqual(["a", "b"]);
    toggle("a");
    expect(useComparisonStore.getState().selectedIds).toEqual(["b"]);
  });

  it(`does not exceed ${MAX_COMPARISON} selections`, () => {
    const { toggle } = useComparisonStore.getState();
    for (let i = 0; i < MAX_COMPARISON + 2; i += 1) toggle(`repo-${i}`);
    expect(useComparisonStore.getState().selectedIds).toHaveLength(MAX_COMPARISON);
    // A new id is ignored when full, but de-selecting an existing one still works.
    toggle("repo-0");
    expect(useComparisonStore.getState().selectedIds).toHaveLength(MAX_COMPARISON - 1);
  });

  it("clears the selection", () => {
    const { toggle, clear } = useComparisonStore.getState();
    toggle("a");
    toggle("b");
    clear();
    expect(useComparisonStore.getState().selectedIds).toEqual([]);
  });
});
