import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import Ajv2020 from "ajv/dist/2020";
import { analyzeRepository } from "@/modules/analyzer-core";
import { exportJsonSummary } from "@/modules/export-engine";
import type { Repository, RepositoryReadmeState, RepositoryTreeState } from "@/types";

const here = dirname(fileURLToPath(import.meta.url));

function loadSchema(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(here, name), "utf8")) as Record<string, unknown>;
}

const repository: Repository = {
  id: "1",
  name: "openready",
  fullName: "octocat/openready",
  description: "Repository health desktop app",
  url: "https://github.com/octocat/openready",
  homepageUrl: "https://example.com/openready",
  language: "TypeScript",
  topics: ["desktop", "github"],
  license: { key: "mit", name: "MIT License", spdxId: "MIT", url: null },
  defaultBranch: "main",
  stars: 12,
  forks: 3,
  archived: false,
  fork: false,
  createdAt: "2025-05-28T10:00:00Z",
  updatedAt: "2026-05-28T10:00:00Z",
  pushedAt: "2026-05-28T09:00:00Z",
};

const readme: RepositoryReadmeState = {
  status: "found",
  readme: {
    repositoryFullName: "octocat/openready",
    path: "README.md",
    htmlUrl: "https://github.com/octocat/openready/blob/main/README.md",
    content: "# OpenReady\n\n## Overview\nHelps developers.\n\n## Installation\npnpm install\n",
  },
};

const tree: RepositoryTreeState = {
  status: "found",
  tree: {
    repositoryFullName: "octocat/openready",
    truncated: false,
    entries: [
      { path: "package.json", type: "blob" },
      { path: "pnpm-lock.yaml", type: "blob" },
      { path: ".github/workflows/ci.yml", type: "blob" },
    ],
  },
};

describe("openready.export.v1 schema", () => {
  it("matches the JSON produced by exportJsonSummary", () => {
    const ajv = new Ajv2020({ allErrors: true });
    const validate = ajv.compile(loadSchema("openready.export.v1.schema.json"));

    // Cover a populated repo and an empty-analysis export so the schema is
    // exercised against both the rich and the minimal shapes.
    const populated = analyzeRepository(repository, readme, tree, new Date("2026-05-31T00:00:00Z"));
    const empty = analyzeRepository(
      { ...repository, id: "2", fullName: "octocat/bare" },
      { status: "missing" },
      { status: "empty" },
      new Date("2026-05-31T00:00:00Z"),
    );

    for (const analyses of [[populated], [populated, empty], []]) {
      const json = JSON.parse(
        exportJsonSummary({ username: "octocat", analyses, generatedAt: "2026-05-31T00:00:00Z" }),
      );
      const valid = validate(json);
      if (!valid) {
        throw new Error(`Export failed schema validation: ${ajv.errorsText(validate.errors)}`);
      }
      expect(valid).toBe(true);
    }
  });

  it("rejects an export with the wrong schema tag", () => {
    const ajv = new Ajv2020();
    const validate = ajv.compile(loadSchema("openready.export.v1.schema.json"));
    expect(
      validate({
        schema: "openready.export.v2",
        generatedAt: "x",
        username: "y",
        repositoryCount: 0,
        repositories: [],
      }),
    ).toBe(false);
  });
});
