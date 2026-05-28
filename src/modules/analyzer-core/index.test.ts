import { describe, expect, it } from "vitest";
import { analyzeRepository, analyzeRepositories } from "./index";
import type { Repository, RepositoryReadmeState } from "@/types";

const now = new Date("2026-05-28T12:00:00Z");

function repository(overrides: Partial<Repository> = {}): Repository {
  return {
    id: "1",
    name: "openready",
    fullName: "octocat/openready",
    description: "Repository health desktop app",
    url: "https://github.com/octocat/openready",
    homepageUrl: "https://example.com/openready",
    language: "TypeScript",
    topics: ["desktop", "github"],
    license: {
      key: "mit",
      name: "MIT License",
      spdxId: "MIT",
      url: "https://api.github.com/licenses/mit",
    },
    defaultBranch: "main",
    stars: 12,
    forks: 3,
    archived: false,
    fork: false,
    createdAt: "2025-05-28T10:00:00Z",
    updatedAt: "2026-05-28T10:00:00Z",
    pushedAt: "2026-05-28T09:00:00Z",
    ...overrides,
  };
}

function foundReadme(content: string): RepositoryReadmeState {
  return {
    status: "found",
    readme: {
      repositoryFullName: "octocat/openready",
      path: "README.md",
      htmlUrl: "https://github.com/octocat/openready/blob/main/README.md",
      content,
    },
  };
}

const strongReadme = `# OpenReady

OpenReady helps developers understand whether repositories are ready to share with other people.

## Setup

Run pnpm install and pnpm dev.

## Usage

Enter a GitHub username and review the repository list.

## Screenshots

![Dashboard](./docs/dashboard.png)

## Tech Stack

Tauri, React and TypeScript.

## Testing

Run pnpm test.

## Roadmap

Scoring and exports come later.
`;

describe("analyzer-core", () => {
  it("returns Strong start for a repository with metadata and README sections", () => {
    const result = analyzeRepository(repository(), foundReadme(strongReadme), now);

    expect(result.healthLabel).toBe("Strong start");
    expect(result.failedCount).toBe(0);
    expect(result.passedCount).toBeGreaterThan(8);
  });

  it("returns Needs README when README is missing", () => {
    const result = analyzeRepository(repository(), { status: "missing" }, now);

    expect(result.healthLabel).toBe("Needs README");
    expect(result.checks.find((check) => check.id === "readme")).toMatchObject({
      status: "failed",
      evidence: "No README found",
    });
  });

  it("returns Stale when the repository has no recent activity", () => {
    const result = analyzeRepository(
      repository({
        updatedAt: "2024-01-01T10:00:00Z",
        pushedAt: "2024-01-01T10:00:00Z",
      }),
      foundReadme(strongReadme),
      now,
    );

    expect(result.healthLabel).toBe("Stale");
    expect(result.missingSignals).toContain("Last activity was 878 days ago");
  });

  it("prioritizes Archived and Fork labels", () => {
    expect(
      analyzeRepository(repository({ archived: true }), foundReadme(strongReadme), now).healthLabel,
    ).toBe("Archived");
    expect(
      analyzeRepository(repository({ fork: true }), foundReadme(strongReadme), now).healthLabel,
    ).toBe("Fork");
  });

  it("returns Needs metadata when core repository metadata is missing", () => {
    const result = analyzeRepository(
      repository({
        description: null,
        topics: [],
        homepageUrl: null,
        license: null,
      }),
      foundReadme(strongReadme),
      now,
    );

    expect(result.healthLabel).toBe("Needs metadata");
    expect(result.missingSignals).toEqual([
      "No repository description provided",
      "No repository topics configured",
      "No homepage or demo link configured",
    ]);
  });

  it("returns Needs presentation when README has no screenshots or demo", () => {
    const result = analyzeRepository(
      repository(),
      foundReadme(`# OpenReady

OpenReady helps developers understand whether repositories are ready to share.

## Setup
Run pnpm install.

## Usage
Enter a GitHub username.

## Tech Stack
Tauri, React and TypeScript.

## Testing
Run pnpm test.

## Roadmap
Add scoring.
`),
      now,
    );

    expect(result.healthLabel).toBe("Needs presentation");
    expect(result.missingSignals).toContain("No screenshots or demo found");
  });

  it("marks README checks unknown when README fetch fails", () => {
    const result = analyzeRepository(
      repository(),
      { status: "unknown", message: "GitHub rate limit reached." },
      now,
    );

    expect(result.healthLabel).toBe("Strong start");
    expect(result.unknownCount).toBeGreaterThan(0);
    expect(result.checks.find((check) => check.id === "readme")).toMatchObject({
      status: "unknown",
      evidence: "GitHub rate limit reached.",
    });
  });

  it("analyzes repository lists using README state keyed by repository id", () => {
    const results = analyzeRepositories(
      [repository({ id: "1" }), repository({ id: "2", name: "empty" })],
      {
        "1": foundReadme(strongReadme),
        "2": { status: "missing" },
      },
      now,
    );

    expect(results.map((result) => result.healthLabel)).toEqual(["Strong start", "Needs README"]);
  });
});
