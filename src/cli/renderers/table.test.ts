import { describe, expect, it } from "vitest";
import { padCell, renderTable } from "./table";
import type { AnalysisResult } from "@/types";

describe("padCell", () => {
  it("left-pads short values to the requested width", () => {
    expect(padCell("hi", 5, "left")).toBe("hi   ");
  });

  it("right-pads short values to the requested width", () => {
    expect(padCell("hi", 5, "right")).toBe("   hi");
  });

  it("truncates long values with an ellipsis", () => {
    expect(padCell("a-very-long-name", 5, "left")).toBe("a-ve…");
  });
});

function analysis(name: string, score: number | null): AnalysisResult {
  return {
    repository: {
      id: name,
      name,
      fullName: `octocat/${name}`,
      description: null,
      url: `https://github.com/octocat/${name}`,
      homepageUrl: null,
      language: null,
      topics: [],
      license: null,
      defaultBranch: "main",
      stars: 0,
      forks: 0,
      archived: false,
      fork: false,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
      pushedAt: "2025-01-01T00:00:00Z",
    },
    checks: [],
    analyzedAt: "2025-01-01T00:00:00Z",
    healthLabel: "Almost ready",
    score: {
      total: score,
      categories: [
        {
          category: "documentation",
          label: "Documentation",
          score: 50,
          passed: 1,
          failed: 1,
          applicable: 2,
          weight: 1,
          contributingCheckIds: [],
        },
      ],
      weakestCategory: "documentation",
      strongestCategory: "documentation",
    },
    passedCount: 0,
    failedCount: 0,
    unknownCount: 0,
    missingSignals: ["No README found"],
    recommendations: [],
    classification: {
      type: "frontend",
      detectedType: "frontend",
      confidence: "high",
      reasons: [],
      runnerUp: null,
      overridden: false,
    },
    hiddenGem: { isHiddenGem: false, reasons: [] },
  };
}

describe("renderTable", () => {
  it("includes header and one row per analysis", () => {
    const output = renderTable([analysis("repo-a", 72), analysis("repo-b", null)], {
      username: "octocat",
      tokenInUse: false,
      totalFetched: 2,
      analyzedCount: 2,
    });
    expect(output).toContain("OpenReady analysis · octocat");
    expect(output).toContain("Repository");
    expect(output).toContain("repo-a");
    expect(output).toContain("repo-b");
    expect(output).toContain("Frontend app");
    expect(output).toContain("No README found");
  });
});
