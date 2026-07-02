import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Repository } from "@/types";
import { parseCliArgs } from "./args";
import { runAnalyze } from "./run";

vi.mock("@/modules/github-client", () => ({
  fetchUserRepositories: vi.fn(),
  fetchRepositoryReadme: vi.fn(),
  fetchRepositoryTree: vi.fn(),
  setGitHubAuthToken: vi.fn(),
  GitHubClientError: class GitHubClientError extends Error {},
}));

import {
  fetchUserRepositories,
  fetchRepositoryReadme,
  fetchRepositoryTree,
} from "@/modules/github-client";

const repository: Repository = {
  id: "1",
  name: "openready",
  fullName: "octocat/openready",
  description: "Repository health desktop app",
  url: "https://github.com/octocat/openready",
  homepageUrl: "https://example.com/openready",
  language: "TypeScript",
  topics: ["desktop", "github"],
  license: { key: "mit", name: "MIT License", spdxId: "MIT", url: null },
  defaultBranch: "main",
  stars: 12,
  forks: 3,
  archived: false,
  fork: false,
  createdAt: "2025-05-28T10:00:00Z",
  updatedAt: new Date().toISOString(),
  pushedAt: new Date().toISOString(),
};

let scratch: string;
let packFile: string;
let stdout: string;
let stderr: string;

beforeAll(async () => {
  // Vitest's module runner only hands dynamic imports of externalized files to
  // native ESM, so the fixture pack must live under node_modules, not os.tmpdir().
  const cacheRoot = join(process.cwd(), "node_modules", ".cache");
  await mkdir(cacheRoot, { recursive: true });
  scratch = await mkdtemp(join(cacheRoot, "openready-run-test-"));
  packFile = join(scratch, "pack.mjs");
  await writeFile(
    packFile,
    `export default [
      { id: "acme/always-pass", label: "Always passes", run: () => ({ status: "passed" }) },
      { id: "acme/always-fail", label: "Always fails", run: () => ({ status: "failed", evidence: "nope" }) },
    ];\n`,
  );
});

afterAll(async () => {
  await rm(scratch, { recursive: true, force: true });
});

beforeEach(() => {
  vi.clearAllMocks();
  stdout = "";
  stderr = "";
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdout += String(chunk);
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderr += String(chunk);
    return true;
  });
  vi.mocked(fetchUserRepositories).mockResolvedValue([repository]);
  vi.mocked(fetchRepositoryReadme).mockResolvedValue(null);
  vi.mocked(fetchRepositoryTree).mockResolvedValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function run(argv: string[]): Promise<number> {
  const command = parseCliArgs(argv);
  if (command.kind !== "analyze") throw new Error(`Expected analyze args, got ${command.kind}`);
  const { exitCode } = await runAnalyze(command);
  return exitCode;
}

async function writeProfile(name: string, profile: unknown): Promise<string> {
  const path = join(scratch, name);
  await writeFile(path, JSON.stringify(profile));
  return path;
}

describe("runAnalyze gating and plugins", () => {
  it("exits 0 when no gates are configured", async () => {
    expect(await run(["analyze", "octocat"])).toBe(0);
  });

  it("exits 4 with reasons on stderr when --fail-under trips", async () => {
    expect(await run(["analyze", "octocat", "--fail-under", "100"])).toBe(4);
    expect(stderr).toContain("openready: gate:");
    expect(stderr).toContain("octocat/openready");
    expect(stderr).toContain("gate failed with 1 violation.");
  });

  it("still emits the rendered output before failing the gate", async () => {
    expect(await run(["analyze", "octocat", "--format", "json", "--fail-under", "100"])).toBe(4);
    const json = JSON.parse(stdout) as { repositories: unknown[] };
    expect(json.repositories).toHaveLength(1);
  });

  it("exits 0 when --fail-under is met", async () => {
    expect(await run(["analyze", "octocat", "--fail-under", "0"])).toBe(0);
  });

  it("runs pack checks and includes customChecks in the JSON export", async () => {
    const code = await run([
      "analyze",
      "octocat",
      "--format",
      "json",
      "--plugins",
      packFile,
      "--allow-plugins",
    ]);
    expect(stderr).toBe("");
    expect(code).toBe(0);
    const json = JSON.parse(stdout) as {
      repositories: { customChecks: { id: string; status: string }[] }[];
    };
    expect(json.repositories[0].customChecks).toEqual([
      expect.objectContaining({ id: "acme/always-pass", status: "passed" }),
      expect.objectContaining({ id: "acme/always-fail", status: "failed" }),
    ]);
  });

  it("exits 0 when a required check passes for every repository", async () => {
    const code = await run([
      "analyze",
      "octocat",
      "--plugins",
      packFile,
      "--allow-plugins",
      "--require-check",
      "acme/always-pass",
    ]);
    expect(code).toBe(0);
  });

  it("exits 4 when a required check fails", async () => {
    const code = await run([
      "analyze",
      "octocat",
      "--plugins",
      packFile,
      "--allow-plugins",
      "--require-check",
      "acme/always-fail",
    ]);
    expect(code).toBe(4);
    expect(stderr).toContain("failed required check acme/always-fail");
  });

  it("exits 4 when a required check is missing because no packs were loaded", async () => {
    expect(await run(["analyze", "octocat", "--require-check", "acme/always-pass"])).toBe(4);
    expect(stderr).toContain("missing required check acme/always-pass");
  });

  it("exits 2 on an unreadable plugin path without calling GitHub", async () => {
    const code = await run([
      "analyze",
      "octocat",
      "--plugins",
      join(scratch, "does-not-exist.mjs"),
      "--allow-plugins",
    ]);
    expect(code).toBe(2);
    expect(stderr).toContain("Plugin path not found");
    expect(vi.mocked(fetchUserRepositories)).not.toHaveBeenCalled();
  });

  it("exits 2 on an invalid profile without calling GitHub", async () => {
    const path = await writeProfile("bad-profile.json", { schema: "nope" });
    expect(await run(["analyze", "octocat", "--profile", path])).toBe(2);
    expect(stderr).toContain("Invalid profile");
    expect(vi.mocked(fetchUserRepositories)).not.toHaveBeenCalled();
  });

  it("uses the profile failUnder threshold as the default gate", async () => {
    const path = await writeProfile("strict-profile.json", {
      schema: "openready.profile.v1",
      name: "Strict",
      categoryWeights: {},
      thresholds: { failUnder: 100 },
    });
    expect(await run(["analyze", "octocat", "--profile", path])).toBe(4);
    expect(stderr).toContain("below --fail-under 100");
  });

  it("lets an explicit --fail-under override the profile threshold", async () => {
    const path = await writeProfile("strict-profile-2.json", {
      schema: "openready.profile.v1",
      name: "Strict",
      categoryWeights: {},
      thresholds: { failUnder: 100 },
    });
    expect(await run(["analyze", "octocat", "--profile", path, "--fail-under", "0"])).toBe(0);
  });

  it("applies profile category weights to scoring", async () => {
    // Zeroing out every category the fixture can score should change the total
    // versus the unweighted run, proving weights reach the scoring engine.
    await run(["analyze", "octocat", "--format", "json"]);
    const unweighted = JSON.parse(stdout) as { repositories: { score: { total: number } }[] };

    stdout = "";
    const path = await writeProfile("weighted-profile.json", {
      schema: "openready.profile.v1",
      name: "Weighted",
      categoryWeights: { documentation: 0, presentation: 0, buildability: 0 },
    });
    await run(["analyze", "octocat", "--format", "json", "--profile", path]);
    const weighted = JSON.parse(stdout) as { repositories: { score: { total: number } }[] };

    expect(weighted.repositories[0].score.total).not.toEqual(
      unweighted.repositories[0].score.total,
    );
  });
});
