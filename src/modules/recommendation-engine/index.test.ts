import { describe, it, expect } from "vitest";
import { generateRecommendations } from "./index";
import type { CheckResult } from "@/types";

describe("recommendation-engine", () => {
  it("should return an empty array if there are no failed checks", () => {
    const checks: CheckResult[] = [
      { id: "readme", label: "README exists", category: "documentation", status: "passed" },
      { id: "license", label: "License exists", category: "metadata", status: "not-applicable" },
    ];
    const recs = generateRecommendations(checks);
    expect(recs).toEqual([]);
  });

  it("should generate a recommendation for a failed check", () => {
    const checks: CheckResult[] = [
      { id: "readme", label: "README exists", category: "documentation", status: "failed" },
    ];
    const recs = generateRecommendations(checks);
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({
      id: "rec-readme",
      checkId: "readme",
      priority: "high",
    });
    expect(recs[0].title).toBe("Add a README.md");
  });

  it("should sort recommendations by priority (high > medium > low)", () => {
    const checks: CheckResult[] = [
      { id: "docs-folder", label: "Docs folder", category: "documentation", status: "failed" }, // low
      { id: "readme", label: "README exists", category: "documentation", status: "failed" }, // high
      { id: "tests-present", label: "Tests present", category: "tests", status: "failed" }, // medium
    ];
    const recs = generateRecommendations(checks);
    expect(recs).toHaveLength(3);
    expect(recs[0].priority).toBe("high");
    expect(recs[0].checkId).toBe("readme");
    expect(recs[1].priority).toBe("medium");
    expect(recs[1].checkId).toBe("tests-present");
    expect(recs[2].priority).toBe("low");
    expect(recs[2].checkId).toBe("docs-folder");
  });

  it("should ignore failed checks without a corresponding rule", () => {
    const checks: CheckResult[] = [
      { id: "unknown-check", label: "Unknown", category: "status", status: "failed" },
    ];
    const recs = generateRecommendations(checks);
    expect(recs).toEqual([]);
  });
});
