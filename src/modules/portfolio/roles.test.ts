import { describe, expect, it } from "vitest";
import { ROLE_PRESETS, rolePreset, scoreRepoForRole, suggestRole } from "./roles";
import type { TechSignal } from "@/modules/analyzer-core";
import type { AnalysisResult, ProjectType, Repository } from "@/types";

function repository(overrides: Partial<Repository> = {}): Repository {
  return {
    id: "1",
    name: "repo",
    fullName: "octocat/repo",
    description: "A repository",
    url: "https://github.com/octocat/repo",
    homepageUrl: null,
    language: "TypeScript",
    topics: [],
    license: null,
    defaultBranch: "main",
    stars: 3,
    forks: 0,
    archived: false,
    fork: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    pushedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function analysis(
  type: ProjectType,
  total: number,
  repoOverrides: Partial<Repository> = {},
  hiddenGem = false,
): AnalysisResult {
  return {
    repository: repository(repoOverrides),
    checks: [],
    analyzedAt: "2026-01-01T00:00:00Z",
    healthLabel: "Almost ready",
    score: { total, categories: [], weakestCategory: null, strongestCategory: null },
    passedCount: 0,
    failedCount: 0,
    unknownCount: 0,
    missingSignals: [],
    recommendations: [],
    classification: {
      type,
      detectedType: type,
      confidence: "high",
      reasons: [],
      runnerUp: null,
      overridden: false,
    },
    hiddenGem: { isHiddenGem: hiddenGem, reasons: [] },
  };
}

function signal(id: TechSignal["id"], label: string): TechSignal {
  return { id, label, evidence: [] };
}

describe("rolePreset", () => {
  it("returns the matching preset and falls back to generalist", () => {
    expect(rolePreset("frontend").label).toBe("Frontend Engineer");
    // Every preset id resolves; generalist is the documented fallback.
    expect(ROLE_PRESETS.some((p) => p.id === "generalist")).toBe(true);
  });
});

describe("scoreRepoForRole", () => {
  it("rewards project-type, tech-signal, and language matches with reasons", () => {
    const result = scoreRepoForRole(
      analysis("frontend", 80, { language: "TypeScript" }),
      [signal("node", "Node.js")],
      "frontend",
    );
    expect(result.relevance).toBeGreaterThan(80);
    expect(result.bonus).toBe(15 + 8 + 10); // type + one signal + language
    expect(result.reasons).toEqual([
      "Detected as a frontend project",
      "Uses Node.js",
      "Written in TypeScript",
    ]);
  });

  it("adds a hidden-gem nudge and caps signal bonuses", () => {
    const result = scoreRepoForRole(
      analysis("backend", 70, { language: "Go" }, true),
      [
        signal("node", "Node.js"),
        signal("python", "Python"),
        signal("go", "Go"),
        signal("docker", "Docker"),
      ],
      "backend",
    );
    // 4 matching signals * 8 = 32, capped at 24.
    expect(result.bonus).toBe(15 + 24 + 10 + 5);
  });

  it("gives only the base score when nothing matches the role", () => {
    const result = scoreRepoForRole(
      analysis("library", 60, { language: "Elixir" }),
      [],
      "frontend",
    );
    expect(result.relevance).toBe(60);
    expect(result.bonus).toBe(0);
    expect(result.reasons).toEqual([]);
  });
});

describe("suggestRole", () => {
  it("picks the dominant role across the repo mix", () => {
    const analyses = [
      analysis("backend", 80, { id: "1", language: "Go" }),
      analysis("backend", 75, { id: "2", language: "Python" }),
      analysis("frontend", 60, { id: "3", language: "TypeScript" }),
    ];
    const signalsById = {
      "1": [signal("go", "Go"), signal("docker", "Docker")],
      "2": [signal("python", "Python"), signal("docker", "Docker")],
      "3": [signal("node", "Node.js")],
    };
    expect(suggestRole(analyses, signalsById)).toBe("backend");
  });

  it("falls back to generalist when no specialization stands out", () => {
    const analyses = [
      analysis("unknown", 50, { id: "1", language: "Haskell" }),
      analysis("unknown", 40, { id: "2", language: "Elixir" }),
    ];
    expect(suggestRole(analyses, { "1": [], "2": [] })).toBe("generalist");
  });
});
