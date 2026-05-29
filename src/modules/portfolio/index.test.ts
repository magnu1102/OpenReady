import { describe, expect, it } from "vitest";
import { buildCvBullets, buildTalkingPoints, selectFeatured } from "./index";
import type { TechSignal } from "@/modules/analyzer-core";
import type { AnalysisResult, CheckResult, ProjectType, Recommendation, Repository } from "@/types";

function repository(overrides: Partial<Repository> = {}): Repository {
  return {
    id: "1",
    name: "repo",
    fullName: "octocat/repo",
    description: "A handy tool",
    url: "https://github.com/octocat/repo",
    homepageUrl: null,
    language: "TypeScript",
    topics: [],
    license: null,
    defaultBranch: "main",
    stars: 4,
    forks: 0,
    archived: false,
    fork: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    pushedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function passed(id: string): CheckResult {
  return { id, label: id, category: "tests", status: "passed" };
}

function analysis(
  options: {
    type?: ProjectType;
    total?: number;
    repo?: Partial<Repository>;
    checks?: CheckResult[];
    recommendations?: Recommendation[];
    strongest?: AnalysisResult["score"]["strongestCategory"];
  } = {},
): AnalysisResult {
  return {
    repository: repository(options.repo),
    checks: options.checks ?? [],
    analyzedAt: "2026-01-01T00:00:00Z",
    healthLabel: "Almost ready",
    score: {
      total: options.total ?? 70,
      categories: options.strongest
        ? [
            {
              category: options.strongest,
              label: "Testing & CI",
              score: 90,
              passed: 2,
              failed: 0,
              applicable: 2,
              weight: 1,
              contributingCheckIds: [],
            },
          ]
        : [],
      weakestCategory: null,
      strongestCategory: options.strongest ?? null,
    },
    passedCount: 0,
    failedCount: 0,
    unknownCount: 0,
    missingSignals: [],
    recommendations: options.recommendations ?? [],
    classification: {
      type: options.type ?? "cli",
      detectedType: options.type ?? "cli",
      confidence: "high",
      reasons: [],
      runnerUp: null,
      overridden: false,
    },
    hiddenGem: { isHiddenGem: false, reasons: [] },
  };
}

function signal(id: TechSignal["id"], label: string): TechSignal {
  return { id, label, evidence: [] };
}

describe("selectFeatured", () => {
  it("excludes forks and archived repos from the automatic list", () => {
    const analyses = [
      analysis({ repo: { id: "1", name: "good" }, total: 80 }),
      analysis({ repo: { id: "2", name: "forked", fork: true }, total: 95 }),
      analysis({ repo: { id: "3", name: "old", archived: true }, total: 95 }),
    ];
    const featured = selectFeatured(analyses, {}, "backend");
    expect(featured.map((f) => f.analysis.repository.id)).toEqual(["1"]);
  });

  it("force-includes a pinned repo and force-excludes an unpinned one", () => {
    const analyses = [
      analysis({ repo: { id: "1", name: "good" }, total: 80 }),
      analysis({ repo: { id: "2", name: "forked", fork: true }, total: 30 }),
    ];
    const featured = selectFeatured(analyses, {}, "backend", { "1": false, "2": true });
    const ids = featured.map((f) => f.analysis.repository.id);
    expect(ids).toContain("2"); // pinned despite being a fork
    expect(ids).not.toContain("1"); // explicitly unpinned
    expect(featured.find((f) => f.analysis.repository.id === "2")?.pinned).toBe(true);
  });

  it("ranks by relevance and keeps pinned repos ahead of the limit", () => {
    const analyses = Array.from({ length: 8 }, (_, i) =>
      analysis({ repo: { id: String(i), name: `r${i}` }, total: 50 + i }),
    );
    const featured = selectFeatured(analyses, {}, "generalist", {}, 3);
    expect(featured).toHaveLength(3);
    // Highest totals first (id 7,6,5).
    expect(featured.map((f) => f.analysis.repository.id)).toEqual(["7", "6", "5"]);
  });
});

describe("buildCvBullets", () => {
  it("builds fact-based bullets from stack, engineering, and score", () => {
    const featured = selectFeatured(
      [
        analysis({
          type: "backend",
          total: 82,
          repo: { id: "1", name: "api", language: "Go", stars: 12, description: "REST API." },
          checks: [passed("tests-present"), passed("github-actions")],
        }),
      ],
      {},
      "backend",
    );
    const [entry] = buildCvBullets(featured, "backend");
    expect(entry.bullets[0]).toContain("Go");
    expect(entry.bullets[0]).toContain("REST API");
    expect(entry.bullets.some((b) => b.includes("automated tests"))).toBe(true);
    expect(entry.bullets.some((b) => b.includes("CI via GitHub Actions"))).toBe(true);
    expect(entry.bullets.some((b) => b.includes("82/100"))).toBe(true);
    expect(entry.bullets.some((b) => b.includes("12 GitHub stars"))).toBe(true);
  });
});

describe("buildTalkingPoints", () => {
  it("surfaces highlights, questions, and gaps from recommendations", () => {
    const result = buildTalkingPoints(
      analysis({
        type: "cli",
        repo: { name: "tool" },
        strongest: "testing-ci",
        recommendations: [
          {
            id: "rec-readme",
            checkId: "readme",
            title: "Add a README.md",
            description: "",
            priority: "high",
            category: "documentation",
            scoreImpact: 10,
          },
        ],
      }),
      [signal("node", "Node.js")],
    );
    expect(result.highlights.some((h) => h.includes("Testing & CI"))).toBe(true);
    expect(result.highlights.some((h) => h.includes("Node.js"))).toBe(true);
    expect(result.likelyQuestions.length).toBe(3);
    expect(result.gapsToOwn).toContain("Add a README.md");
  });
});
