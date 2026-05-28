import { describe, expect, it } from "vitest";
import type { CheckCategory, CheckResult, CheckStatus } from "@/types";
import { scoreChecks } from "./index";

function check(id: string, category: CheckCategory, status: CheckStatus): CheckResult {
  return { id, label: id, category, status };
}

describe("scoring-engine", () => {
  it("scores each category as passed / (passed + failed) * 100", () => {
    const result = scoreChecks([
      check("description", "metadata", "passed"),
      check("topics", "metadata", "passed"),
      check("homepage", "documentation", "failed"),
      check("license", "metadata", "failed"),
    ]);

    const metadata = result.categories.find((c) => c.category === "metadata-discoverability");
    expect(metadata).toMatchObject({
      passed: 2,
      failed: 1,
      applicable: 3,
      score: 67,
    });
  });

  it("excludes not-applicable and unknown checks from the denominator", () => {
    const result = scoreChecks([
      check("a", "buildability", "passed"),
      check("b", "buildability", "passed"),
      check("c", "buildability", "not-applicable"),
      check("d", "buildability", "unknown"),
    ]);

    const buildability = result.categories.find((c) => c.category === "buildability");
    expect(buildability).toMatchObject({ score: 100, applicable: 2 });
  });

  it("reports null score and excludes the category from the total when no checks are applicable", () => {
    const result = scoreChecks([
      check("a", "infrastructure", "not-applicable"),
      check("b", "metadata", "passed"),
    ]);

    const deploy = result.categories.find((c) => c.category === "deployment-operations");
    expect(deploy?.score).toBeNull();
    expect(result.total).toBe(100);
  });

  it("returns total null when every category has no applicable checks", () => {
    const result = scoreChecks([
      check("a", "documentation", "unknown"),
      check("b", "buildability", "unknown"),
    ]);

    expect(result.total).toBeNull();
    expect(result.weakestCategory).toBeNull();
    expect(result.strongestCategory).toBeNull();
  });

  it("splits presentation away from documentation by specific check ids", () => {
    const result = scoreChecks([
      check("readme", "documentation", "passed"),
      check("readme-purpose", "documentation", "passed"),
      check("readme-screenshots-demo", "documentation", "failed"),
      check("homepage", "metadata", "failed"),
    ]);

    const presentation = result.categories.find((c) => c.category === "presentation");
    const documentation = result.categories.find((c) => c.category === "documentation");

    expect(presentation).toMatchObject({ passed: 0, failed: 2, score: 0 });
    expect(documentation).toMatchObject({ passed: 2, failed: 0, score: 100 });
  });

  it("identifies weakest and strongest applicable categories", () => {
    const result = scoreChecks([
      check("description", "metadata", "passed"),
      check("license", "metadata", "passed"),
      check("readme", "documentation", "failed"),
      check("readme-purpose", "documentation", "failed"),
    ]);

    expect(result.weakestCategory).toBe("documentation");
    expect(result.strongestCategory).toBe("metadata-discoverability");
  });

  it("returns an empty result shape when given no checks", () => {
    const result = scoreChecks([]);

    expect(result.total).toBeNull();
    expect(result.categories).toHaveLength(8);
    expect(result.categories.every((c) => c.score === null)).toBe(true);
  });

  it("averages applicable category scores into the total", () => {
    const result = scoreChecks([
      check("description", "metadata", "passed"),
      check("license", "metadata", "failed"),
      check("recent-activity", "activity", "passed"),
      check("not-archived", "status", "passed"),
    ]);

    const metadata = result.categories.find((c) => c.category === "metadata-discoverability");
    const maint = result.categories.find((c) => c.category === "maintainability");
    expect(metadata?.score).toBe(50);
    expect(maint?.score).toBe(100);
    expect(result.total).toBe(75);
  });
});
