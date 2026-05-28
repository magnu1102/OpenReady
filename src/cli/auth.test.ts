import { afterEach, describe, expect, it, vi } from "vitest";
import { applyGitHubAuth } from "./auth";
import * as ghClient from "@/modules/github-client";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("applyGitHubAuth", () => {
  it("prefers the CLI flag over env vars", () => {
    const spy = vi.spyOn(ghClient, "setGitHubAuthToken").mockImplementation(() => {});
    const result = applyGitHubAuth("flag-token", {
      OPENREADY_GITHUB_TOKEN: "openready",
      GITHUB_TOKEN: "github",
    });
    expect(result).toBe("flag-token");
    expect(spy).toHaveBeenCalledWith("flag-token");
  });

  it("falls back to OPENREADY_GITHUB_TOKEN", () => {
    vi.spyOn(ghClient, "setGitHubAuthToken").mockImplementation(() => {});
    expect(applyGitHubAuth(null, { OPENREADY_GITHUB_TOKEN: "openready" })).toBe("openready");
  });

  it("falls back to GITHUB_TOKEN", () => {
    vi.spyOn(ghClient, "setGitHubAuthToken").mockImplementation(() => {});
    expect(applyGitHubAuth(null, { GITHUB_TOKEN: "github" })).toBe("github");
  });

  it("returns null and clears the client when nothing is set", () => {
    const spy = vi.spyOn(ghClient, "setGitHubAuthToken").mockImplementation(() => {});
    expect(applyGitHubAuth(null, {})).toBeNull();
    expect(spy).toHaveBeenCalledWith(null);
  });

  it("treats empty strings as absent", () => {
    vi.spyOn(ghClient, "setGitHubAuthToken").mockImplementation(() => {});
    expect(applyGitHubAuth("  ", { OPENREADY_GITHUB_TOKEN: "real" })).toBe("real");
  });
});
