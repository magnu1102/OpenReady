import { describe, expect, it } from "vitest";
import { analyzeRepository } from "@/modules/analyzer-core";
import {
  exportHomepageCards,
  exportJsonSummary,
  exportMarkdownReport,
  suggestedExportFilename,
} from ".";
import type { AnalysisResult, Repository, RepositoryReadmeState, RepositoryTreeState } from "@/types";

const baseRepository: Repository = {
  id: "1",
  name: "openready",
  fullName: "octocat/openready",
  description: "Repository health desktop app",
  url: "https://github.com/octocat/openready",
  homepageUrl: "https://example.com/openready",
  language: "TypeScript",
  topics: ["desktop", "github", "portfolio"],
  license: null,
  defaultBranch: "main",
  stars: 12,
  forks: 3,
  archived: false,
  fork: false,
  createdAt: "2025-05-28T10:00:00Z",
  updatedAt: "2026-05-28T10:00:00Z",
  pushedAt: "2026-05-28T09:00:00Z",
};

const completeReadme: RepositoryReadmeState = {
  status: "found",
  readme: {
    repositoryFullName: "octocat/openready",
    path: "README.md",
    htmlUrl: "https://github.com/octocat/openready/blob/main/README.md",
    content: `# OpenReady

## Overview
OpenReady helps developers understand repository readiness.

## Installation
pnpm install

## Usage
pnpm dev

## Screenshots
![Dashboard](./dashboard.png)

## Tech Stack
React, TypeScript and Tauri.

## Testing
pnpm test

## Roadmap
Export support is next.`,
  },
};

const completeTree: RepositoryTreeState = {
  status: "found",
  tree: {
    repositoryFullName: "octocat/openready",
    truncated: false,
    entries: [
      { path: "package.json", type: "blob" },
      { path: "pnpm-lock.yaml", type: "blob" },
      { path: ".github/workflows/ci.yml", type: "blob" },
      { path: "src/App.test.tsx", type: "blob" },
      { path: "Dockerfile", type: "blob" },
      { path: "docs/architecture.md", type: "blob" },
      { path: "SECURITY.md", type: "blob" },
      { path: ".env.example", type: "blob" },
    ],
  },
};

describe("export-engine", () => {
  it("creates a Markdown report with summary, scores and recommendations", () => {
    const report = exportMarkdownReport({
      username: "octocat",
      analyses: [analysisFor(baseRepository)],
      generatedAt: "2026-05-28T12:00:00.000Z",
    });

    expect(report).toContain("# OpenReady report for octocat");
    expect(report).toContain("Repositories analyzed: 1");
    expect(report).toContain("### octocat/openready");
    expect(report).toContain("- Score:");
    expect(report).toContain("- Label:");
    expect(report).toContain("- Add a license (high)");
  });

  it("creates a JSON v1 summary with failed and unknown checks", () => {
    const unknownReadme: RepositoryReadmeState = {
      status: "unknown",
      message: "GitHub rate limit reached.",
    };
    const json = exportJsonSummary({
      username: "octocat",
      analyses: [analysisFor(baseRepository, unknownReadme, undefined)],
      generatedAt: "2026-05-28T12:00:00.000Z",
    });
    const parsed = JSON.parse(json);

    expect(parsed.schema).toBe("openready.export.v1");
    expect(parsed.repositoryCount).toBe(1);
    expect(parsed.repositories[0].fullName).toBe("octocat/openready");
    expect(parsed.repositories[0].failedChecks.length).toBeGreaterThan(0);
    expect(parsed.repositories[0].unknownChecks.length).toBeGreaterThan(0);
    expect(parsed.repositories[0].recommendations).toEqual(expect.any(Array));
  });

  it("creates homepage cards from original repositories before forks", () => {
    const forked = analysisFor({
      ...baseRepository,
      id: "2",
      name: "forked-project",
      fullName: "octocat/forked-project",
      fork: true,
      stars: 999,
    });
    const original = analysisFor({
      ...baseRepository,
      id: "3",
      name: "original-project",
      fullName: "octocat/original-project",
      stars: 10,
    });

    const cards = exportHomepageCards({
      username: "octocat",
      analyses: [forked, original],
      generatedAt: "2026-05-28",
    });

    expect(cards).toContain("## [original\\-project]");
    expect(cards).not.toContain("forked\\-project");
    expect(cards).toContain("**Score:**");
    expect(cards).toContain("**Next improvement:**");
  });

  it("handles empty exports", () => {
    expect(exportMarkdownReport({ username: "octocat", analyses: [] })).toContain(
      "No repositories were available for export.",
    );
    expect(exportHomepageCards({ username: "octocat", analyses: [] })).toContain(
      "No repositories were available for homepage cards.",
    );
  });

  it("suggests safe filenames for each format", () => {
    expect(suggestedExportFilename("markdown", "Octo Cat!")).toBe("octo-cat-openready-report.md");
    expect(suggestedExportFilename("json", "Octo Cat!")).toBe("octo-cat-openready-summary.json");
    expect(suggestedExportFilename("homepage-cards", "Octo Cat!")).toBe(
      "octo-cat-homepage-cards.md",
    );
  });
});

function analysisFor(
  repository: Repository,
  readmeState: RepositoryReadmeState = completeReadme,
  treeState: RepositoryTreeState | undefined = completeTree,
): AnalysisResult {
  return analyzeRepository(repository, readmeState, treeState, new Date("2026-05-28T12:00:00Z"));
}
