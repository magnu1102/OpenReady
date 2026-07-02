import { describe, expect, it } from "vitest";
import type { AnalysisResult } from "@/types";
import type { CustomCheckResult } from "@/modules/check-plugins";
import { evaluateGating } from "./gating";

// The gate only reads `repository.id`, `repository.fullName`, and `score.total`,
// so a minimal cast keeps these tests focused on the gating semantics.
function analysis(id: string, fullName: string, total: number | null): AnalysisResult {
  return { repository: { id, fullName }, score: { total } } as unknown as AnalysisResult;
}

function customCheck(id: string, status: CustomCheckResult["status"]): CustomCheckResult {
  return { id, label: id, category: "custom", status, source: "plugin", pluginId: id };
}

describe("evaluateGating", () => {
  it("passes when no gates are configured", () => {
    const outcome = evaluateGating(
      [analysis("1", "octocat/a", 10)],
      {},
      {
        failUnder: null,
        requireChecks: [],
      },
    );
    expect(outcome).toEqual({ passed: true, reasons: [] });
  });

  it("fails repositories scoring below --fail-under, naming each one", () => {
    const outcome = evaluateGating(
      [analysis("1", "octocat/low", 40), analysis("2", "octocat/high", 90)],
      {},
      { failUnder: 70, requireChecks: [] },
    );
    expect(outcome.passed).toBe(false);
    expect(outcome.reasons).toHaveLength(1);
    expect(outcome.reasons[0]).toContain("octocat/low");
    expect(outcome.reasons[0]).toContain("40");
  });

  it("never trips the score gate for null scores (not enough data)", () => {
    const outcome = evaluateGating(
      [analysis("1", "octocat/a", null)],
      {},
      {
        failUnder: 99,
        requireChecks: [],
      },
    );
    expect(outcome.passed).toBe(true);
  });

  it("passes a score exactly at the threshold", () => {
    const outcome = evaluateGating(
      [analysis("1", "octocat/a", 70)],
      {},
      {
        failUnder: 70,
        requireChecks: [],
      },
    );
    expect(outcome.passed).toBe(true);
  });

  it("fails when a required check is missing", () => {
    const outcome = evaluateGating(
      [analysis("1", "octocat/a", 90)],
      {},
      {
        failUnder: null,
        requireChecks: ["acme/has-changelog"],
      },
    );
    expect(outcome.passed).toBe(false);
    expect(outcome.reasons[0]).toContain("missing required check acme/has-changelog");
  });

  it("fails when a required check exists but did not pass", () => {
    const outcome = evaluateGating(
      [analysis("1", "octocat/a", 90)],
      { "1": [customCheck("acme/has-changelog", "failed")] },
      { failUnder: null, requireChecks: ["acme/has-changelog"] },
    );
    expect(outcome.passed).toBe(false);
    expect(outcome.reasons[0]).toContain("failed required check acme/has-changelog (failed)");
  });

  it("passes when required checks pass for every repository", () => {
    const outcome = evaluateGating(
      [analysis("1", "octocat/a", 90), analysis("2", "octocat/b", 80)],
      {
        "1": [customCheck("acme/has-changelog", "passed")],
        "2": [customCheck("acme/has-changelog", "passed")],
      },
      { failUnder: 70, requireChecks: ["acme/has-changelog"] },
    );
    expect(outcome).toEqual({ passed: true, reasons: [] });
  });

  it("collects score and check violations together", () => {
    const outcome = evaluateGating(
      [analysis("1", "octocat/a", 10)],
      { "1": [customCheck("acme/has-changelog", "unknown")] },
      { failUnder: 50, requireChecks: ["acme/has-changelog"] },
    );
    expect(outcome.passed).toBe(false);
    expect(outcome.reasons).toHaveLength(2);
  });
});
