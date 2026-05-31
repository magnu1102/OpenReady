import { describe, expect, it } from "vitest";
import { officialPack } from "./official";
import { runCheckPlugins } from "./run";
import { validatePackManifest } from "./validate";
import type { CheckSnapshot } from "./types";

function snapshotWithPaths(paths: string[]): CheckSnapshot {
  return {
    repository: {
      id: "1",
      name: "demo",
      fullName: "octocat/demo",
      description: null,
      url: "https://github.com/octocat/demo",
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
      pushedAt: null,
    },
    readme: { found: false, content: "" },
    tree: { available: true, truncated: false, paths },
    techSignals: [],
  };
}

describe("official pack", () => {
  it("has a valid manifest whose checkIds match its checks", () => {
    const validation = validatePackManifest(officialPack.manifest);
    expect(validation.ok).toBe(true);
    expect(officialPack.manifest.checkIds.sort()).toEqual(
      officialPack.checks.map((check) => check.id).sort(),
    );
  });

  it("passes when hygiene files exist and fails when they do not", () => {
    const present = runCheckPlugins(
      officialPack.checks,
      snapshotWithPaths([
        "CHANGELOG.md",
        "CONTRIBUTING.md",
        ".github/ISSUE_TEMPLATE/bug.yml",
        "LICENSE",
      ]),
    );
    expect(present.every((result) => result.status === "passed")).toBe(true);

    const absent = runCheckPlugins(officialPack.checks, snapshotWithPaths(["package.json"]));
    expect(absent.every((result) => result.status === "failed")).toBe(true);
  });
});
