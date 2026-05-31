import { describe, expect, it } from "vitest";
import { runCheckPlugins } from "./run";
import type { CheckPlugin, CheckSnapshot } from "./types";

const snapshot: CheckSnapshot = {
  repository: {
    id: "1",
    name: "demo",
    fullName: "octocat/demo",
    description: "x",
    url: "https://github.com/octocat/demo",
    homepageUrl: null,
    language: "TypeScript",
    topics: ["cli", "Tooling"],
    license: null,
    defaultBranch: "main",
    stars: 1,
    forks: 0,
    archived: false,
    fork: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-06-01T00:00:00Z",
    pushedAt: "2025-06-01T00:00:00Z",
  },
  readme: { found: true, content: "# Demo\n\n## Security\nReport issues privately." },
  tree: {
    available: true,
    truncated: false,
    paths: ["package.json", "src/index.ts", ".github/ISSUE_TEMPLATE/bug.yml"],
  },
  techSignals: [],
};

function plugin(over: Partial<CheckPlugin>): CheckPlugin {
  return { id: "acme/check", label: "Check", run: () => ({ status: "passed" }), ...over };
}

describe("runCheckPlugins", () => {
  it("runs well-formed checks and exposes snapshot helpers", () => {
    const results = runCheckPlugins(
      [
        plugin({
          id: "acme/has-issue-templates",
          run: (ctx) => ({
            status: ctx.hasPath(".github/ISSUE_TEMPLATE/**") ? "passed" : "failed",
          }),
        }),
        plugin({
          id: "acme/readme-security",
          run: (ctx) => ({ status: ctx.readmeMatches(/## Security/i) ? "passed" : "failed" }),
        }),
        plugin({
          id: "acme/has-topic",
          run: (ctx) => ({ status: ctx.hasTopic("tooling") ? "passed" : "failed" }),
        }),
      ],
      snapshot,
    );
    expect(results.map((r) => r.status)).toEqual(["passed", "passed", "passed"]);
    expect(results[0]).toMatchObject({ source: "plugin", pluginId: "acme/has-issue-templates" });
  });

  it("never crashes on a throwing plugin", () => {
    const results = runCheckPlugins(
      [
        plugin({
          id: "acme/throws",
          run: () => {
            throw new Error("boom");
          },
        }),
      ],
      snapshot,
    );
    expect(results[0].status).toBe("unknown");
    expect(results[0].evidence).toContain("boom");
  });

  it("rejects invalid ids, invalid output, and duplicates", () => {
    const results = runCheckPlugins(
      [
        plugin({ id: "BadId" }),
        plugin({ id: "acme/bad-output", run: () => ({ status: "nope" }) as never }),
        plugin({ id: "acme/dup", run: () => ({ status: "passed" }) }),
        plugin({ id: "acme/dup", run: () => ({ status: "failed" }) }),
      ],
      snapshot,
    );
    expect(results[0].status).toBe("unknown");
    expect(results[0].evidence).toContain("Invalid check id");
    expect(results[1].status).toBe("unknown");
    expect(results[1].evidence).toContain("invalid status");
    expect(results[2].status).toBe("passed");
    expect(results[3].status).toBe("unknown");
    expect(results[3].evidence).toContain("Duplicate");
  });

  it("clips overly long evidence", () => {
    const results = runCheckPlugins(
      [plugin({ id: "acme/long", run: () => ({ status: "failed", evidence: "x".repeat(500) }) })],
      snapshot,
    );
    expect(results[0].evidence?.length).toBeLessThanOrEqual(300);
    expect(results[0].evidence?.endsWith("…")).toBe(true);
  });
});
