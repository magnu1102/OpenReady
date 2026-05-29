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

  it("should generate a recommendation for a failed check with category and impact", () => {
    const checks: CheckResult[] = [
      { id: "readme", label: "README exists", category: "documentation", status: "failed" },
    ];
    const recs = generateRecommendations(checks);
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({
      id: "rec-readme",
      checkId: "readme",
      priority: "high",
      category: "documentation",
    });
    expect(recs[0].title).toBe("Add a README.md");
    // Sole applicable check: resolving it moves documentation 0 -> 100.
    expect(recs[0].scoreImpact).toBe(100);
  });

  it("breaks ties by priority when score impact is equal", () => {
    // All three live in the documentation category, so flipping any one yields
    // the same total impact — priority decides the order.
    const checks: CheckResult[] = [
      { id: "readme-roadmap", label: "Roadmap", category: "documentation", status: "failed" }, // low
      { id: "readme", label: "README exists", category: "documentation", status: "failed" }, // high
      { id: "readme-usage", label: "Usage", category: "documentation", status: "failed" }, // medium
    ];
    const recs = generateRecommendations(checks);
    expect(recs.map((r) => r.priority)).toEqual(["high", "medium", "low"]);
    expect(recs.map((r) => r.checkId)).toEqual(["readme", "readme-usage", "readme-roadmap"]);
  });

  it("lets a high-impact medium climb above a low-impact high", () => {
    const checks: CheckResult[] = [
      // documentation is mostly satisfied, so resolving the README moves little.
      { id: "readme-purpose", label: "Purpose", category: "documentation", status: "passed" },
      { id: "readme-setup", label: "Setup", category: "documentation", status: "passed" },
      { id: "readme-usage", label: "Usage", category: "documentation", status: "passed" },
      { id: "readme", label: "README exists", category: "documentation", status: "failed" }, // high
      // testing-ci has a single failing check, so resolving it moves a lot.
      { id: "tests-present", label: "Tests present", category: "tests", status: "failed" }, // medium
    ];
    const recs = generateRecommendations(checks);
    expect(recs[0].checkId).toBe("tests-present");
    expect(recs[0].priority).toBe("medium");
    expect(recs[1].checkId).toBe("readme");
    expect(recs[0].scoreImpact).toBeGreaterThan(recs[1].scoreImpact);
  });

  it("respects active category weights when computing impact ordering", () => {
    const checks: CheckResult[] = [
      { id: "readme", label: "README exists", category: "documentation", status: "failed" }, // high
      { id: "tests-present", label: "Tests present", category: "tests", status: "failed" }, // medium
    ];
    const unweighted = generateRecommendations(checks);
    const weighted = generateRecommendations(checks, { "testing-ci": 5 });
    // Heavily weighting testing-ci raises the projected impact of resolving it.
    const testsUnweighted = unweighted.find((r) => r.checkId === "tests-present")!.scoreImpact;
    const testsWeighted = weighted.find((r) => r.checkId === "tests-present")!.scoreImpact;
    expect(testsWeighted).toBeGreaterThan(testsUnweighted);
  });

  it("should ignore failed checks without a corresponding rule", () => {
    const checks: CheckResult[] = [
      { id: "unknown-check", label: "Unknown", category: "status", status: "failed" },
    ];
    const recs = generateRecommendations(checks);
    expect(recs).toEqual([]);
  });
});
