import { describe, expect, it } from "vitest";
import { badgeFromExport, renderBadgeEndpoint, renderBadgeSvg, scoreToColor } from "./index";

function exportSummary(repos: Array<{ name: string; fullName: string; total: number | null }>) {
  return {
    schema: "openready.export.v1",
    generatedAt: "2026-07-05T00:00:00.000Z",
    username: "octocat",
    repositoryCount: repos.length,
    repositories: repos.map((repo, index) => ({
      id: String(index + 1),
      name: repo.name,
      fullName: repo.fullName,
      score: { total: repo.total },
    })),
  };
}

describe("scoreToColor", () => {
  it("maps the health-tier boundaries", () => {
    expect(scoreToColor(85)).toBe("brightgreen");
    expect(scoreToColor(84)).toBe("green");
    expect(scoreToColor(70)).toBe("green");
    expect(scoreToColor(69)).toBe("yellow");
    expect(scoreToColor(50)).toBe("yellow");
    expect(scoreToColor(49)).toBe("red");
    expect(scoreToColor(0)).toBe("red");
    expect(scoreToColor(null)).toBe("lightgrey");
  });
});

describe("badgeFromExport", () => {
  it("uses the single repository's score directly", () => {
    const result = badgeFromExport(
      exportSummary([{ name: "a", fullName: "octocat/a", total: 87 }]),
    );
    expect(result).toEqual({
      ok: true,
      badge: { label: "openready", message: "87/100", color: "brightgreen" },
    });
  });

  it("averages non-null scores across repositories, rounding", () => {
    const result = badgeFromExport(
      exportSummary([
        { name: "a", fullName: "octocat/a", total: 70 },
        { name: "b", fullName: "octocat/b", total: 75 },
        { name: "c", fullName: "octocat/c", total: null },
      ]),
    );
    // (70 + 75) / 2 = 72.5 → 73; null scores are excluded, not counted as zero.
    expect(result).toEqual({
      ok: true,
      badge: { label: "openready", message: "73/100", color: "green" },
    });
  });

  it("selects a repository case-insensitively by name or fullName", () => {
    const summary = exportSummary([
      { name: "Alpha", fullName: "octocat/Alpha", total: 90 },
      { name: "beta", fullName: "octocat/beta", total: 30 },
    ]);
    for (const needle of ["alpha", "ALPHA", "octocat/alpha"]) {
      const result = badgeFromExport(summary, { repo: needle });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.badge.message).toBe("90/100");
    }
  });

  it("reports repo-not-found when no repository matches", () => {
    const result = badgeFromExport(
      exportSummary([{ name: "a", fullName: "octocat/a", total: 90 }]),
      { repo: "nope" },
    );
    expect(result).toEqual({
      ok: false,
      code: "repo-not-found",
      error: "no repository matched --repo nope in the report.",
    });
  });

  it("renders 'unavailable' in lightgrey when no repository has a score", () => {
    const result = badgeFromExport(
      exportSummary([{ name: "a", fullName: "octocat/a", total: null }]),
    );
    expect(result).toEqual({
      ok: true,
      badge: { label: "openready", message: "unavailable", color: "lightgrey" },
    });
  });

  it("renders 'unavailable' for an empty report", () => {
    const result = badgeFromExport(exportSummary([]));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.badge.message).toBe("unavailable");
  });

  it("honours a custom label and falls back on blank labels", () => {
    const summary = exportSummary([{ name: "a", fullName: "octocat/a", total: 90 }]);
    const custom = badgeFromExport(summary, { label: "my score" });
    if (custom.ok) expect(custom.badge.label).toBe("my score");
    const blank = badgeFromExport(summary, { label: "   " });
    if (blank.ok) expect(blank.badge.label).toBe("openready");
  });

  it.each([
    ["a string", "not json we expect"],
    ["null", null],
    ["a different schema", { schema: "openready.pack.v1", repositories: [] }],
    ["a missing repositories array", { schema: "openready.export.v1" }],
    [
      "malformed repository entries",
      { schema: "openready.export.v1", repositories: [{ name: 1 }] },
    ],
  ])("rejects %s as invalid input", (_label, input) => {
    const result = badgeFromExport(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invalid-input");
  });
});

describe("renderBadgeEndpoint", () => {
  it("produces the exact shields.io endpoint shape", () => {
    const json = renderBadgeEndpoint({
      label: "openready",
      message: "87/100",
      color: "brightgreen",
    });
    expect(json.endsWith("\n")).toBe(true);
    expect(JSON.parse(json)).toEqual({
      schemaVersion: 1,
      label: "openready",
      message: "87/100",
      color: "brightgreen",
    });
  });
});

describe("renderBadgeSvg", () => {
  it("renders a deterministic flat badge", () => {
    const svg = renderBadgeSvg({ label: "openready", message: "87/100", color: "brightgreen" });
    expect(svg).toContain('role="img"');
    expect(svg).toContain("<title>openready: 87/100</title>");
    expect(svg).toContain('fill="#4c1"');
    expect(renderBadgeSvg({ label: "openready", message: "87/100", color: "brightgreen" })).toBe(
      svg,
    );
  });

  it("uses the color hex for each tier", () => {
    expect(renderBadgeSvg({ label: "l", message: "m", color: "green" })).toContain("#97ca00");
    expect(renderBadgeSvg({ label: "l", message: "m", color: "yellow" })).toContain("#dfb317");
    expect(renderBadgeSvg({ label: "l", message: "m", color: "red" })).toContain("#e05d44");
    expect(renderBadgeSvg({ label: "l", message: "m", color: "lightgrey" })).toContain("#9f9f9f");
  });

  it("escapes XML in label and message", () => {
    const svg = renderBadgeSvg({ label: "<b>&\"'", message: "m", color: "red" });
    expect(svg).toContain("&lt;b&gt;&amp;&quot;&apos;");
    expect(svg).not.toContain("<b>");
  });

  it("sizes sections from a fixed per-character width", () => {
    const svg = renderBadgeSvg({ label: "ab", message: "cd", color: "red" });
    // 2 chars → round(2 * 6.5) + 12 = 25 per section, 50 total.
    expect(svg).toContain('width="50" height="20"');
    expect(svg).toContain('<rect width="25" height="20" fill="#555"/>');
  });
});
