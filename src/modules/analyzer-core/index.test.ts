import { describe, expect, it } from "vitest";
import { analyzeRepository, analyzeRepositories } from "./index";
import type {
  Repository,
  RepositoryReadmeState,
  RepositoryTree,
  RepositoryTreeState,
} from "@/types";

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

function tree(paths: string[], truncated = false): RepositoryTree {
  return {
    repositoryFullName: "octocat/openready",
    truncated,
    entries: paths.map((path) => ({ path, type: "blob" as const })),
  };
}

function foundTree(paths: string[]): RepositoryTreeState {
  return { status: "found", tree: tree(paths) };
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
  it("returns Portfolio-ready for a repository with metadata and README sections", () => {
    const result = analyzeRepository(repository(), foundReadme(strongReadme), undefined, now);

    expect(result.healthLabel).toBe("Portfolio-ready");
    expect(result.failedCount).toBe(0);
    expect(result.passedCount).toBeGreaterThan(8);
    expect(result.score.total).toBeGreaterThanOrEqual(85);
  });

  it("drops the documentation score to zero when README is missing", () => {
    const result = analyzeRepository(repository(), { status: "missing" }, undefined, now);

    const doc = result.score.categories.find((c) => c.category === "documentation");
    expect(doc?.score).toBe(0);
    expect(result.score.weakestCategory).toBe("documentation");
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
      undefined,
      now,
    );

    expect(result.healthLabel).toBe("Stale");
    expect(result.missingSignals).toContain("Last activity was 878 days ago");
  });

  it("prioritizes Archived and Fork labels", () => {
    expect(
      analyzeRepository(repository({ archived: true }), foundReadme(strongReadme), undefined, now)
        .healthLabel,
    ).toBe("Archived");
    expect(
      analyzeRepository(repository({ fork: true }), foundReadme(strongReadme), undefined, now)
        .healthLabel,
    ).toBe("Fork");
  });

  it("drops the metadata score and weakest category when metadata is missing", () => {
    const result = analyzeRepository(
      repository({
        description: null,
        topics: [],
        homepageUrl: null,
        license: null,
      }),
      foundReadme(strongReadme),
      undefined,
      now,
    );

    const metadata = result.score.categories.find((c) => c.category === "metadata-discoverability");
    expect(metadata?.score).toBe(0);
    expect(result.score.weakestCategory).toBe("metadata-discoverability");
    expect(result.missingSignals).toEqual([
      "No repository description provided",
      "No repository topics configured",
      "No homepage or demo link configured",
    ]);
  });

  it("identifies presentation as the weakest category when README has no screenshots or demo", () => {
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
      undefined,
      now,
    );

    expect(result.score.weakestCategory).toBe("presentation");
    expect(result.missingSignals).toContain("No screenshots or demo found");
  });

  it("marks README checks unknown when README fetch fails", () => {
    const result = analyzeRepository(
      repository(),
      { status: "unknown", message: "GitHub rate limit reached." },
      undefined,
      now,
    );

    expect(result.healthLabel).toBe("Portfolio-ready");
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
      {},
      now,
    );

    expect(results.map((result) => result.healthLabel)).toEqual([
      "Portfolio-ready",
      "Almost ready",
    ]);
  });

  describe("tier labels", () => {
    it("maps a high total to Portfolio-ready", () => {
      const result = analyzeRepository(repository(), foundReadme(strongReadme), undefined, now);
      expect(result.score.total).toBeGreaterThanOrEqual(85);
      expect(result.healthLabel).toBe("Portfolio-ready");
    });
  });

  describe("buildability and CI checks", () => {
    it("marks buildability/ci checks unknown when no tree state is provided", () => {
      const result = analyzeRepository(repository(), foundReadme(strongReadme), undefined, now);

      for (const id of ["build-manifest", "lockfile", "dockerfile", "github-actions"]) {
        expect(result.checks.find((check) => check.id === id)).toMatchObject({ status: "unknown" });
      }
    });

    it("passes build, lockfile, docker and CI checks when matching files are present", () => {
      const result = analyzeRepository(
        repository(),
        foundReadme(strongReadme),
        foundTree(["package.json", "pnpm-lock.yaml", "Dockerfile", ".github/workflows/ci.yml"]),
        now,
      );

      expect(result.checks.find((c) => c.id === "build-manifest")?.status).toBe("passed");
      expect(result.checks.find((c) => c.id === "lockfile")).toMatchObject({
        status: "passed",
        evidence: "pnpm-lock.yaml",
      });
      expect(result.checks.find((c) => c.id === "dockerfile")?.status).toBe("passed");
      expect(result.checks.find((c) => c.id === "github-actions")?.status).toBe("passed");
    });

    it("fails build, lockfile, docker and CI checks when nothing is detected", () => {
      const result = analyzeRepository(
        repository(),
        foundReadme(strongReadme),
        foundTree(["README.md", "src/index.ts"]),
        now,
      );

      expect(result.checks.find((c) => c.id === "build-manifest")?.status).toBe("failed");
      expect(result.checks.find((c) => c.id === "lockfile")?.status).toBe("failed");
      expect(result.checks.find((c) => c.id === "dockerfile")?.status).toBe("failed");
      expect(result.checks.find((c) => c.id === "github-actions")?.status).toBe("failed");
    });

    it("treats an empty repository tree as not-applicable", () => {
      const result = analyzeRepository(
        repository(),
        foundReadme(strongReadme),
        { status: "empty" },
        now,
      );

      expect(result.checks.find((c) => c.id === "build-manifest")?.status).toBe("not-applicable");
      expect(result.checks.find((c) => c.id === "dockerfile")?.status).toBe("not-applicable");
    });

    it("keeps positive evidence on truncated trees but marks misses unknown", () => {
      const truncated: RepositoryTreeState = {
        status: "truncated",
        tree: { ...tree(["Dockerfile"]), truncated: true },
      };
      const result = analyzeRepository(repository(), foundReadme(strongReadme), truncated, now);

      expect(result.checks.find((c) => c.id === "dockerfile")?.status).toBe("passed");
      expect(result.checks.find((c) => c.id === "build-manifest")?.status).toBe("unknown");
    });
  });

  describe("tests, infrastructure and docs-folder checks", () => {
    it("passes the tests check when a test directory is present", () => {
      const result = analyzeRepository(
        repository(),
        foundReadme(strongReadme),
        {
          status: "found",
          tree: {
            repositoryFullName: "octocat/openready",
            truncated: false,
            entries: [
              { path: "tests", type: "tree" },
              { path: "tests/test_app.py", type: "blob" },
            ],
          },
        },
        now,
      );

      expect(result.checks.find((c) => c.id === "tests-present")?.status).toBe("passed");
    });

    it("fails the tests check when no test files or directories are found", () => {
      const result = analyzeRepository(
        repository(),
        foundReadme(strongReadme),
        foundTree(["package.json", "src/index.ts"]),
        now,
      );

      expect(result.checks.find((c) => c.id === "tests-present")?.status).toBe("failed");
    });

    it("marks infrastructure-as-code passed when Terraform or Kubernetes manifests are detected", () => {
      const result = analyzeRepository(
        repository(),
        foundReadme(strongReadme),
        foundTree(["infra/main.tf", "k8s/deployment.yaml"]),
        now,
      );

      expect(result.checks.find((c) => c.id === "infrastructure-as-code")).toMatchObject({
        status: "passed",
      });
    });

    it("marks infrastructure-as-code not-applicable for repositories without IaC", () => {
      const result = analyzeRepository(
        repository(),
        foundReadme(strongReadme),
        foundTree(["package.json", "src/index.ts"]),
        now,
      );

      expect(result.checks.find((c) => c.id === "infrastructure-as-code")?.status).toBe(
        "not-applicable",
      );
    });

    it("passes the docs-folder check when docs/ entries exist", () => {
      const result = analyzeRepository(
        repository(),
        foundReadme(strongReadme),
        foundTree(["docs/intro.md", "docs/usage.md"]),
        now,
      );

      expect(result.checks.find((c) => c.id === "docs-folder")?.status).toBe("passed");
    });

    it("fails the docs-folder check when nothing is found", () => {
      const result = analyzeRepository(
        repository(),
        foundReadme(strongReadme),
        foundTree(["README.md"]),
        now,
      );

      expect(result.checks.find((c) => c.id === "docs-folder")?.status).toBe("failed");
    });
  });

  describe("security-hygiene checks", () => {
    it("passes when SECURITY.md and an example env file are committed", () => {
      const result = analyzeRepository(
        repository(),
        foundReadme(strongReadme),
        foundTree(["SECURITY.md", ".env.example"]),
        now,
      );

      expect(result.checks.find((c) => c.id === "security-md")).toMatchObject({
        status: "passed",
        evidence: "SECURITY.md",
      });
      expect(result.checks.find((c) => c.id === "env-example")).toMatchObject({
        status: "passed",
        evidence: ".env.example",
      });
    });

    it("recognises common variants of the example env filename", () => {
      const result = analyzeRepository(
        repository(),
        foundReadme(strongReadme),
        foundTree([".env.sample"]),
        now,
      );

      expect(result.checks.find((c) => c.id === "env-example")?.status).toBe("passed");
    });

    it("fails security checks when neither file is present", () => {
      const result = analyzeRepository(
        repository(),
        foundReadme(strongReadme),
        foundTree(["package.json", "src/index.ts"]),
        now,
      );

      expect(result.checks.find((c) => c.id === "security-md")?.status).toBe("failed");
      expect(result.checks.find((c) => c.id === "env-example")?.status).toBe("failed");
    });

    it("marks security checks unknown when the tree is unavailable", () => {
      const result = analyzeRepository(repository(), foundReadme(strongReadme), undefined, now);

      expect(result.checks.find((c) => c.id === "security-md")?.status).toBe("unknown");
      expect(result.checks.find((c) => c.id === "env-example")?.status).toBe("unknown");
    });
  });
});
