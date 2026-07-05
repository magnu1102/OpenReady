import { describe, expect, it } from "vitest";
import { parseCliArgs } from "./args";

describe("parseCliArgs", () => {
  it("returns help when given no arguments", () => {
    expect(parseCliArgs([])).toEqual({ kind: "help" });
  });

  it("returns help for --help or -h", () => {
    expect(parseCliArgs(["--help"])).toEqual({ kind: "help" });
    expect(parseCliArgs(["-h"])).toEqual({ kind: "help" });
    expect(parseCliArgs(["analyze", "octocat", "--help"])).toEqual({ kind: "help" });
  });

  it("returns version for --version or -v", () => {
    expect(parseCliArgs(["--version"])).toEqual({ kind: "version" });
    expect(parseCliArgs(["-v"])).toEqual({ kind: "version" });
  });

  it("rejects unknown commands", () => {
    const result = parseCliArgs(["wibble"]);
    expect(result.kind).toBe("error");
  });

  it("parses analyze with default options", () => {
    expect(parseCliArgs(["analyze", "octocat"])).toMatchObject({
      kind: "analyze",
      username: "octocat",
      format: "table",
      limit: 30,
      repo: null,
      out: null,
      token: null,
      fetchReadme: true,
      fetchTree: true,
    });
  });

  it("ignores a leading -- separator forwarded by package managers (#13)", () => {
    expect(parseCliArgs(["--", "analyze", "octocat", "--limit", "5"])).toMatchObject({
      kind: "analyze",
      username: "octocat",
      limit: 5,
    });
    // A lone separator behaves like no arguments.
    expect(parseCliArgs(["--"])).toEqual({ kind: "help" });
  });

  it("parses options end-to-end", () => {
    const result = parseCliArgs([
      "analyze",
      "octocat",
      "--format",
      "json",
      "--limit",
      "5",
      "--repo",
      "Hello-World",
      "--out",
      "/tmp/x.json",
      "--token",
      "ghp_demo",
      "--no-readme",
      "--no-tree",
    ]);
    expect(result).toMatchObject({
      kind: "analyze",
      username: "octocat",
      format: "json",
      limit: 5,
      repo: "Hello-World",
      out: "/tmp/x.json",
      token: "ghp_demo",
      fetchReadme: false,
      fetchTree: false,
    });
  });

  it("rejects unknown formats", () => {
    expect(parseCliArgs(["analyze", "octocat", "--format", "yaml"]).kind).toBe("error");
  });

  it("rejects non-positive limits", () => {
    expect(parseCliArgs(["analyze", "octocat", "--limit", "0"]).kind).toBe("error");
    expect(parseCliArgs(["analyze", "octocat", "--limit", "-3"]).kind).toBe("error");
    expect(parseCliArgs(["analyze", "octocat", "--limit", "abc"]).kind).toBe("error");
  });

  it("rejects missing username", () => {
    expect(parseCliArgs(["analyze"]).kind).toBe("error");
  });

  it("rejects extra positionals", () => {
    expect(parseCliArgs(["analyze", "octocat", "extra"]).kind).toBe("error");
  });

  it("parses badge with default options", () => {
    expect(parseCliArgs(["badge", "--from", "report.json"])).toEqual({
      kind: "badge",
      from: "report.json",
      repo: null,
      format: "endpoint",
      out: null,
      label: null,
    });
  });

  it("parses badge options end-to-end", () => {
    expect(
      parseCliArgs([
        "badge",
        "--from",
        "report.json",
        "--repo",
        "Hello-World",
        "--format",
        "svg",
        "--label",
        "my score",
        "--out",
        "badge.svg",
      ]),
    ).toEqual({
      kind: "badge",
      from: "report.json",
      repo: "Hello-World",
      format: "svg",
      out: "badge.svg",
      label: "my score",
    });
  });

  it("rejects badge without --from", () => {
    expect(parseCliArgs(["badge"]).kind).toBe("error");
  });

  it("rejects unknown badge formats", () => {
    expect(parseCliArgs(["badge", "--from", "r.json", "--format", "png"]).kind).toBe("error");
  });

  it("rejects badge positionals and unknown flags", () => {
    expect(parseCliArgs(["badge", "extra", "--from", "r.json"]).kind).toBe("error");
    expect(parseCliArgs(["badge", "--from", "r.json", "--limit", "5"]).kind).toBe("error");
  });
});
