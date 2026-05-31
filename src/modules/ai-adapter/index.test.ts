import { describe, expect, it, vi } from "vitest";
import { analyzeRepository } from "@/modules/analyzer-core";
import type { Repository, RepositoryReadmeState, RepositoryTreeState } from "@/types";
import { critiqueReadme, suggestWording, summarizeProject, type ChatRunner } from ".";

const repository: Repository = {
  id: "1",
  name: "openready",
  fullName: "octocat/openready",
  description: "Repository health desktop app",
  url: "https://github.com/octocat/openready",
  homepageUrl: null,
  language: "TypeScript",
  topics: ["desktop", "github"],
  license: null,
  defaultBranch: "main",
  stars: 12,
  forks: 3,
  archived: false,
  fork: false,
  createdAt: "2025-05-28T10:00:00Z",
  updatedAt: "2026-05-28T10:00:00Z",
  pushedAt: "2026-05-28T09:00:00Z",
};

const readmeState: RepositoryReadmeState = {
  status: "found",
  readme: {
    repositoryFullName: "octocat/openready",
    path: "README.md",
    htmlUrl: "https://github.com/octocat/openready/blob/main/README.md",
    // Intentionally embeds a secret to prove redaction before send.
    content: "# OpenReady\nRun with token ghp_abcdefghijklmnopqrstuvwxyz0123.",
  },
};

const treeState: RepositoryTreeState = {
  status: "found",
  tree: {
    repositoryFullName: "octocat/openready",
    entries: [{ path: "src/main.tsx", type: "blob" }],
    truncated: false,
  },
};

function sampleResult() {
  return analyzeRepository(repository, readmeState, treeState, new Date("2026-05-28T12:00:00Z"));
}

const config = { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" };

describe("ai-adapter", () => {
  it("critiqueReadme sends a redacted, well-formed message array and returns metadata", async () => {
    const run = vi.fn<ChatRunner>().mockResolvedValue("Add screenshots and a license.");
    const suggestion = await critiqueReadme(
      { result: sampleResult(), readme: readmeState.readme!.content },
      config,
      run,
    );

    expect(run).toHaveBeenCalledOnce();
    const [messages, passedConfig] = run.mock.calls[0];
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
    // The secret in the README must be redacted before leaving the machine.
    const joined = messages.map((m) => m.content).join("\n");
    expect(joined).not.toContain("ghp_");
    expect(joined).toContain("[redacted]");
    expect(passedConfig.model).toBe("gpt-4o-mini");

    expect(suggestion.text).toBe("Add screenshots and a license.");
    expect(suggestion.model).toBe("gpt-4o-mini");
    expect(suggestion.promptCharCount).toBeGreaterThan(0);
  });

  it("summarizeProject returns the runner's text", async () => {
    const run = vi.fn<ChatRunner>().mockResolvedValue("A desktop app for repo health.");
    const suggestion = await summarizeProject(sampleResult(), config, run);
    expect(suggestion.text).toBe("A desktop app for repo health.");
    expect(run.mock.calls[0][0][1].content).toContain("openready");
  });

  it("suggestWording passes the draft through for the given kind", async () => {
    const run = vi.fn<ChatRunner>().mockResolvedValue("Built OpenReady, a Tauri desktop app.");
    await suggestWording(
      { result: sampleResult(), kind: "cv", draft: "Made a repo analyzer." },
      config,
      run,
    );
    expect(run.mock.calls[0][0][1].content).toContain("Made a repo analyzer.");
  });
});
