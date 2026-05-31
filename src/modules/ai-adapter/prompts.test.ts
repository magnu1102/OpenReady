import { describe, expect, it } from "vitest";
import {
  MAX_README_CHARS,
  buildProjectSummaryPrompt,
  buildReadmeCritiquePrompt,
  buildWordingPrompt,
} from "./prompts";

describe("buildReadmeCritiquePrompt", () => {
  it("grounds the prompt in the supplied deterministic findings", () => {
    const messages = buildReadmeCritiquePrompt({
      repoName: "openready",
      language: "TypeScript",
      projectType: "Desktop app",
      readme: "# OpenReady\nSome content.",
      missingSignals: ["No screenshots found"],
      failedCheckLabels: ["License present"],
    });
    expect(messages[0].role).toBe("system");
    const user = messages[1].content;
    expect(user).toContain("No screenshots found");
    expect(user).toContain("License present");
    expect(user).toContain("openready");
    // Instructs the model to base output on the evidence, not invent it.
    expect(user.toLowerCase()).toContain("based only on");
  });

  it("truncates very long READMEs", () => {
    const longReadme = "x".repeat(MAX_README_CHARS + 500);
    const messages = buildReadmeCritiquePrompt({
      repoName: "big",
      language: null,
      projectType: "Unclassified",
      readme: longReadme,
      missingSignals: [],
      failedCheckLabels: [],
    });
    expect(messages[1].content).toContain("(truncated)");
    expect(messages[1].content.length).toBeLessThan(longReadme.length + 1000);
  });
});

describe("buildProjectSummaryPrompt", () => {
  it("includes description, topics, and strong signals", () => {
    const user = buildProjectSummaryPrompt({
      repoName: "openready",
      description: "Repo health analyzer",
      language: "TypeScript",
      topics: ["tauri", "react"],
      projectType: "Desktop app",
      healthLabel: "Portfolio-ready",
      strongSignals: ["README present", "CI workflow detected"],
    })[1].content;
    expect(user).toContain("Repo health analyzer");
    expect(user).toContain("tauri, react");
    expect(user).toContain("CI workflow detected");
    expect(user).toContain("Portfolio-ready");
  });
});

describe("buildWordingPrompt", () => {
  it("frames CV output as a bullet and echoes the draft", () => {
    const user = buildWordingPrompt(
      {
        repoName: "openready",
        description: null,
        language: "TypeScript",
        projectType: "Desktop app",
        draft: "Built a desktop app for repo analysis.",
      },
      "cv",
    )[1].content;
    expect(user.toLowerCase()).toContain("cv");
    expect(user).toContain("Built a desktop app for repo analysis.");
  });

  it("frames homepage output as a visitor blurb", () => {
    const user = buildWordingPrompt(
      {
        repoName: "openready",
        description: null,
        language: null,
        projectType: "Desktop app",
        draft: "A tool.",
      },
      "homepage",
    )[1].content;
    expect(user.toLowerCase()).toContain("homepage");
  });
});
