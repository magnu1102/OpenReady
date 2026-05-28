import { describe, expect, it } from "vitest";
import { classifyRepository } from "./index";
import { detectTechSignals } from "@/modules/analyzer-core/tech-stack";
import type { Repository, RepositoryTree, RepositoryTreeEntry } from "@/types";

function repository(overrides: Partial<Repository> = {}): Repository {
  return {
    id: "1",
    name: "example",
    fullName: "octocat/example",
    description: null,
    url: "https://github.com/octocat/example",
    homepageUrl: null,
    language: null,
    topics: [],
    license: null,
    defaultBranch: "main",
    stars: 0,
    forks: 0,
    archived: false,
    fork: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    pushedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeTree(paths: Array<string | RepositoryTreeEntry>): {
  status: "found";
  tree: RepositoryTree;
} {
  const entries: RepositoryTreeEntry[] = paths.map((value) =>
    typeof value === "string" ? { path: value, type: "blob" } : value,
  );
  const tree: RepositoryTree = {
    repositoryFullName: "octocat/example",
    truncated: false,
    entries,
  };
  return { status: "found", tree };
}

function classify(paths: Array<string | RepositoryTreeEntry>) {
  const treeState = makeTree(paths);
  const signals = detectTechSignals(treeState.tree);
  return classifyRepository(repository(), treeState, signals);
}

describe("project-classifier", () => {
  it("returns unknown when the tree is unavailable", () => {
    const result = classifyRepository(repository(), undefined, []);
    expect(result.type).toBe("unknown");
    expect(result.confidence).toBe("low");
  });

  it("returns unknown when no identifying files are present", () => {
    const result = classify(["README.md", "src/index.ts"]);
    expect(result.type).toBe("unknown");
  });

  it("classifies a Vite + React project as frontend", () => {
    const result = classify([
      "package.json",
      "pnpm-lock.yaml",
      "index.html",
      "vite.config.ts",
      { path: "public", type: "tree" },
      "public/favicon.svg",
      "src/components/App.tsx",
    ]);
    expect(result.type).toBe("frontend");
    expect(result.confidence).toBe("high");
  });

  it("classifies a Tauri desktop app as desktop", () => {
    const result = classify([
      "package.json",
      "pnpm-lock.yaml",
      "index.html",
      "vite.config.ts",
      { path: "src-tauri", type: "tree" },
      "src-tauri/tauri.conf.json",
      "src-tauri/Cargo.toml",
    ]);
    expect(result.type).toBe("desktop");
  });

  it("classifies a Django backend as backend", () => {
    const result = classify([
      "requirements.txt",
      "manage.py",
      "wsgi.py",
      { path: "api", type: "tree" },
      "api/views.py",
      "Dockerfile",
    ]);
    expect(result.type).toBe("backend");
  });

  it("classifies a project with both frontend and backend signals as full-stack", () => {
    const result = classify([
      "package.json",
      "next.config.js",
      "src/pages/index.tsx",
      "requirements.txt",
      "manage.py",
      { path: "api", type: "tree" },
      "api/views.py",
    ]);
    expect(result.type).toBe("full-stack");
  });

  it("classifies a Go CLI as cli", () => {
    const result = classify([
      "go.mod",
      "go.sum",
      { path: "cmd", type: "tree" },
      "cmd/tool/main.go",
    ]);
    expect(result.type).toBe("cli");
  });

  it("classifies a TypeScript library without app shell as library", () => {
    const result = classify([
      "package.json",
      "pnpm-lock.yaml",
      "src/index.ts",
      "tests/api.test.ts",
    ]);
    expect(result.type).toBe("library");
  });

  it("respects a manual override", () => {
    const treeState = makeTree(["index.html", "vite.config.ts"]);
    const signals = detectTechSignals(treeState.tree);
    const result = classifyRepository(repository(), treeState, signals, "cli");
    expect(result.type).toBe("cli");
    expect(result.overridden).toBe(true);
    expect(result.detectedType).toBe("frontend");
  });
});
