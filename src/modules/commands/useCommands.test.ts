import { describe, expect, it } from "vitest";
import { copy } from "@/lib/copy";
import type { Command } from "./types";
import { filterCommands } from "./useCommands";

const sample: Command[] = [
  { id: "a", label: copy.commands.navigate.dashboard.label, group: "navigate", run: () => {} },
  {
    id: "b",
    label: copy.commands.navigate.settings.label,
    hint: copy.commands.navigate.settings.hint,
    group: "navigate",
    run: () => {},
  },
  {
    id: "c",
    label: copy.commands.repositories.open("openready"),
    hint: "octocat/openready",
    group: "repository",
    run: () => {},
  },
  { id: "d", label: copy.commands.view.cycleTheme("dark"), group: "view", run: () => {} },
];

describe("filterCommands", () => {
  it("returns all commands when query is empty", () => {
    expect(filterCommands(sample, "")).toHaveLength(sample.length);
  });

  it("matches against label", () => {
    expect(filterCommands(sample, "dashboard")).toHaveLength(1);
  });

  it("matches against hint", () => {
    const result = filterCommands(sample, "octocat");
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("c");
  });

  it("AND-matches multiple whitespace-separated tokens", () => {
    expect(filterCommands(sample, "open settings")).toHaveLength(1);
    expect(filterCommands(sample, "open zzzz")).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    expect(filterCommands(sample, "THEME")).toHaveLength(1);
  });
});
