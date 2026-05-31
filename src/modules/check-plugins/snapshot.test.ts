import { describe, expect, it } from "vitest";
import { buildCheckSnapshot, createCheckContext } from "./snapshot";
import type { Repository, RepositoryReadmeState, RepositoryTreeState } from "@/types";

const repository: Repository = {
  id: "1",
  name: "demo",
  fullName: "octocat/demo",
  description: null,
  url: "https://github.com/octocat/demo",
  homepageUrl: null,
  language: null,
  topics: ["CLI"],
  license: null,
  defaultBranch: "main",
  stars: 0,
  forks: 0,
  archived: false,
  fork: false,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
  pushedAt: null,
};

describe("buildCheckSnapshot", () => {
  it("captures readme + tree state as plain serializable data", () => {
    const readme: RepositoryReadmeState = {
      status: "found",
      readme: {
        repositoryFullName: "octocat/demo",
        path: "README.md",
        htmlUrl: "x",
        content: "hello",
      },
    };
    const tree: RepositoryTreeState = {
      status: "truncated",
      tree: {
        repositoryFullName: "octocat/demo",
        truncated: true,
        entries: [{ path: "a.ts", type: "blob" }],
      },
    };
    const snapshot = buildCheckSnapshot(repository, readme, tree, []);
    expect(snapshot.readme).toEqual({ found: true, content: "hello" });
    expect(snapshot.tree).toEqual({ available: true, truncated: true, paths: ["a.ts"] });
    // Structured-cloneable (worker-safe): round-trips through JSON unchanged.
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it("treats missing readme/tree as absent without throwing", () => {
    const snapshot = buildCheckSnapshot(repository, { status: "missing" }, { status: "empty" }, []);
    expect(snapshot.readme.found).toBe(false);
    expect(snapshot.tree.available).toBe(false);
  });

  it("helpers support globs, basename, regex, and case-insensitive topics", () => {
    const tree: RepositoryTreeState = {
      status: "found",
      tree: {
        repositoryFullName: "octocat/demo",
        truncated: false,
        entries: [
          { path: "CHANGELOG.md", type: "blob" },
          { path: "src/deep/Widget.tsx", type: "blob" },
        ],
      },
    };
    const ctx = createCheckContext(buildCheckSnapshot(repository, undefined, tree, []));
    expect(ctx.hasPath("CHANGELOG*")).toBe(true);
    expect(ctx.hasPath("src/**/*.tsx")).toBe(true);
    expect(ctx.hasPath("Widget.tsx")).toBe(true);
    expect(ctx.hasPath("missing.txt")).toBe(false);
    expect(ctx.hasTopic("cli")).toBe(true);
    expect(ctx.readmeMatches(/anything/)).toBe(false);
  });
});
