import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { runBadge } from "./badge";
import type { BadgeArgs } from "./args";

const REPORT = JSON.stringify({
  schema: "openready.export.v1",
  generatedAt: "2026-07-05T00:00:00.000Z",
  username: "octocat",
  repositoryCount: 1,
  repositories: [{ id: "1", name: "a", fullName: "octocat/a", score: { total: 87 } }],
});

let scratch: string;
let reportFile: string;
let stdout: string;
let stderr: string;

beforeAll(async () => {
  scratch = await mkdtemp(join(tmpdir(), "openready-badge-test-"));
  reportFile = join(scratch, "report.json");
  await writeFile(reportFile, REPORT);
});

afterAll(async () => {
  await rm(scratch, { recursive: true, force: true });
});

beforeEach(() => {
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
});

afterEach(() => {
  vi.restoreAllMocks();
});

function badgeArgs(overrides: Partial<BadgeArgs> = {}): BadgeArgs {
  return {
    kind: "badge",
    from: reportFile,
    repo: null,
    format: "endpoint",
    out: null,
    label: null,
    ...overrides,
  };
}

describe("runBadge", () => {
  it("writes endpoint JSON to stdout and exits 0", async () => {
    const result = await runBadge(badgeArgs());
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      schemaVersion: 1,
      label: "openready",
      message: "87/100",
      color: "brightgreen",
    });
  });

  it("writes to --out and notes the destination on stderr", async () => {
    const out = join(scratch, "badge.json");
    const result = await runBadge(badgeArgs({ out }));
    expect(result.exitCode).toBe(0);
    expect(stdout).toBe("");
    expect(stderr).toContain(`Wrote badge to ${out}`);
    const written = await readFile(out, "utf8");
    expect(JSON.parse(written).message).toBe("87/100");
  });

  it("renders SVG when --format svg", async () => {
    const result = await runBadge(badgeArgs({ format: "svg" }));
    expect(result.exitCode).toBe(0);
    expect(stdout).toContain("<svg");
    expect(stdout).toContain("87/100");
  });

  it("passes --label and --repo through to the badge", async () => {
    const result = await runBadge(badgeArgs({ repo: "octocat/a", label: "my score" }));
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(stdout).label).toBe("my score");
  });

  it("exits 2 when the report file is unreadable", async () => {
    const missing = join(scratch, "missing.json");
    const result = await runBadge(badgeArgs({ from: missing }));
    expect(result.exitCode).toBe(2);
    expect(stderr).toContain(`openready: report file not found or unreadable: ${missing}`);
  });

  it("exits 2 when the report file is not valid JSON", async () => {
    const broken = join(scratch, "broken.json");
    await writeFile(broken, "not json");
    const result = await runBadge(badgeArgs({ from: broken }));
    expect(result.exitCode).toBe(2);
    expect(stderr).toContain(`openready: report file is not valid JSON: ${broken}`);
  });

  it("exits 2 when the JSON is not an openready export", async () => {
    const other = join(scratch, "other.json");
    await writeFile(other, JSON.stringify({ hello: "world" }));
    const result = await runBadge(badgeArgs({ from: other }));
    expect(result.exitCode).toBe(2);
    expect(stderr).toContain("openready: expected an openready.export.v1 JSON summary");
  });

  it("exits 3 when --repo matches nothing in the report", async () => {
    const result = await runBadge(badgeArgs({ repo: "nope" }));
    expect(result.exitCode).toBe(3);
    expect(stderr).toContain("openready: no repository matched --repo nope");
  });
});
