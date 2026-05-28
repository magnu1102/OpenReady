import { describe, it, expect } from "vitest";
import type { RepositoryTree, RepositoryTreeEntry } from "@/types";
import { detectTechSignals } from "./tech-stack";

function tree(paths: Array<string | [string, "blob" | "tree"]>): RepositoryTree {
  const entries: RepositoryTreeEntry[] = paths.map((value) =>
    typeof value === "string" ? { path: value, type: "blob" } : { path: value[0], type: value[1] },
  );
  return {
    repositoryFullName: "octocat/fixture",
    entries,
    truncated: false,
  };
}

describe("detectTechSignals", () => {
  it("returns no signals for an empty tree", () => {
    expect(detectTechSignals(tree([]))).toEqual([]);
  });

  it("detects Node, Docker and GitHub Actions in a typical web project", () => {
    const signals = detectTechSignals(
      tree([
        "package.json",
        "pnpm-lock.yaml",
        "Dockerfile",
        ".github/workflows/ci.yml",
        ".github/workflows/release.yaml",
        "src/index.ts",
      ]),
    );

    const ids = signals.map((s) => s.id);
    expect(ids).toContain("node");
    expect(ids).toContain("docker");
    expect(ids).toContain("github-actions");

    const actions = signals.find((s) => s.id === "github-actions");
    expect(actions?.evidence).toEqual([
      ".github/workflows/ci.yml",
      ".github/workflows/release.yaml",
    ]);
  });

  it("detects Python via any of several manifest filenames", () => {
    expect(detectTechSignals(tree(["pyproject.toml"]))[0]?.id).toBe("python");
    expect(detectTechSignals(tree(["requirements.txt"]))[0]?.id).toBe("python");
    expect(detectTechSignals(tree(["setup.py"]))[0]?.id).toBe("python");
  });

  it("detects Rust and Go", () => {
    expect(detectTechSignals(tree(["Cargo.toml"]))[0]?.id).toBe("rust");
    expect(detectTechSignals(tree(["go.mod"]))[0]?.id).toBe("go");
  });

  it("detects Java/Gradle and Android together", () => {
    const signals = detectTechSignals(
      tree(["build.gradle.kts", "settings.gradle", "app/src/main/AndroidManifest.xml"]),
    );
    const ids = signals.map((s) => s.id);
    expect(ids).toContain("java-gradle");
    expect(ids).toContain("android");
  });

  it("detects Terraform by extension and Helm/Kubernetes by folder", () => {
    const signals = detectTechSignals(
      tree(["infra/main.tf", "infra/variables.tf", "k8s/deployment.yaml", "charts/api/Chart.yaml"]),
    );
    const ids = signals.map((s) => s.id);
    expect(ids).toContain("terraform");
    expect(ids).toContain("kubernetes");
  });

  it("does not flag arbitrary YAML outside infra folders as kubernetes", () => {
    const signals = detectTechSignals(tree(["config/app.yaml"]));
    expect(signals.map((s) => s.id)).not.toContain("kubernetes");
  });

  it("detects the docs/ folder and tests in multiple languages", () => {
    const signals = detectTechSignals(
      tree([
        ["docs", "tree"],
        "docs/intro.md",
        ["tests", "tree"],
        "tests/test_app.py",
        "pkg/server_test.go",
        "src/utils.test.ts",
      ]),
    );
    const ids = signals.map((s) => s.id);
    expect(ids).toContain("docs-folder");
    expect(ids).toContain("tests");

    const tests = signals.find((s) => s.id === "tests");
    expect(tests?.evidence.length).toBeGreaterThan(0);
    expect(tests?.evidence.length).toBeLessThanOrEqual(3);
  });

  it("caps evidence at three entries per signal", () => {
    const signals = detectTechSignals(
      tree([
        ".github/workflows/a.yml",
        ".github/workflows/b.yml",
        ".github/workflows/c.yml",
        ".github/workflows/d.yml",
        ".github/workflows/e.yml",
      ]),
    );
    const actions = signals.find((s) => s.id === "github-actions");
    expect(actions?.evidence).toHaveLength(3);
  });

  it("emits signals in the canonical declaration order", () => {
    const signals = detectTechSignals(
      tree(["src/foo.test.ts", "docs/intro.md", "Dockerfile", "package.json"]),
    );
    expect(signals.map((s) => s.id)).toEqual(["node", "docker", "docs-folder", "tests"]);
  });
});
