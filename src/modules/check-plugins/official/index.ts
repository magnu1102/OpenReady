import type { CheckPack, CheckPlugin } from "../types";

/**
 * The bundled reference pack. It demonstrates the plugin API and ships a few broadly
 * useful repository-hygiene checks that are intentionally NOT part of the scored core
 * (they are opinionated, not universal). Off by default like every pack.
 */
const checks: CheckPlugin[] = [
  {
    id: "openready/changelog",
    label: "Repository ships a CHANGELOG",
    category: "documentation",
    run: (ctx) => ({
      status: ctx.hasPath("CHANGELOG*") ? "passed" : "failed",
      evidence: ctx.hasPath("CHANGELOG*")
        ? undefined
        : "No CHANGELOG file found — a changelog helps users track releases.",
    }),
  },
  {
    id: "openready/contributing",
    label: "Repository has contribution guidelines",
    category: "documentation",
    run: (ctx) => ({
      status: ctx.hasPath("CONTRIBUTING*") ? "passed" : "failed",
      evidence: ctx.hasPath("CONTRIBUTING*")
        ? undefined
        : "No CONTRIBUTING file found — contribution guidelines lower the barrier for collaborators.",
    }),
  },
  {
    id: "openready/issue-templates",
    label: "Repository provides issue templates",
    category: "metadata",
    run: (ctx) => ({
      status: ctx.hasPath(".github/ISSUE_TEMPLATE/**") ? "passed" : "failed",
      evidence: ctx.hasPath(".github/ISSUE_TEMPLATE/**")
        ? undefined
        : "No .github/ISSUE_TEMPLATE found — templates make bug reports more actionable.",
    }),
  },
  {
    id: "openready/license-file",
    label: "Repository commits a LICENSE file",
    category: "metadata",
    run: (ctx) => ({
      status: ctx.hasPath("LICENSE*") || ctx.hasPath("COPYING*") ? "passed" : "failed",
      evidence:
        ctx.hasPath("LICENSE*") || ctx.hasPath("COPYING*")
          ? undefined
          : "No LICENSE file committed — a license file states reuse terms unambiguously.",
    }),
  },
];

export const officialPack: CheckPack = {
  manifest: {
    schema: "openready.pack.v1",
    name: "OpenReady Official",
    version: "1.0.0",
    author: "OpenReady",
    description:
      "Reference repository-hygiene checks (changelog, contributing, issue templates, license file). Informational; never affects the built-in score.",
    checkIds: checks.map((check) => check.id),
  },
  checks,
};
