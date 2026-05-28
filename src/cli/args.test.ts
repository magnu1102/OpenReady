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
});
