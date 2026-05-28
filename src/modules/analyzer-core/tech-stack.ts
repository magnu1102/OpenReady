import type { RepositoryTree, RepositoryTreeEntry } from "@/types";

export type TechSignalId =
  | "node"
  | "python"
  | "rust"
  | "go"
  | "java-gradle"
  | "android"
  | "docker"
  | "github-actions"
  | "terraform"
  | "kubernetes"
  | "docs-folder"
  | "tests";

export interface TechSignal {
  id: TechSignalId;
  label: string;
  evidence: string[];
}

interface SignalDefinition {
  id: TechSignalId;
  label: string;
  match: (entry: RepositoryTreeEntry) => boolean;
}

const EVIDENCE_LIMIT = 3;

const signalDefinitions: SignalDefinition[] = [
  {
    id: "node",
    label: "Node.js",
    match: (entry) =>
      isBlobNamed(entry, "package.json") ||
      isBlobNamed(entry, "pnpm-lock.yaml") ||
      isBlobNamed(entry, "yarn.lock") ||
      isBlobNamed(entry, "package-lock.json") ||
      isBlobNamed(entry, "bun.lockb"),
  },
  {
    id: "python",
    label: "Python",
    match: (entry) =>
      isBlobNamed(entry, "pyproject.toml") ||
      isBlobNamed(entry, "requirements.txt") ||
      isBlobNamed(entry, "Pipfile") ||
      isBlobNamed(entry, "Pipfile.lock") ||
      isBlobNamed(entry, "setup.py") ||
      isBlobNamed(entry, "setup.cfg") ||
      isBlobNamed(entry, "poetry.lock"),
  },
  {
    id: "rust",
    label: "Rust",
    match: (entry) => isBlobNamed(entry, "Cargo.toml") || isBlobNamed(entry, "Cargo.lock"),
  },
  {
    id: "go",
    label: "Go",
    match: (entry) => isBlobNamed(entry, "go.mod") || isBlobNamed(entry, "go.sum"),
  },
  {
    id: "java-gradle",
    label: "Java / Gradle",
    match: (entry) =>
      entry.type === "blob" &&
      (basename(entry.path) === "build.gradle" ||
        basename(entry.path) === "build.gradle.kts" ||
        basename(entry.path).startsWith("settings.gradle")),
  },
  {
    id: "android",
    label: "Android",
    match: (entry) => isBlobNamed(entry, "AndroidManifest.xml"),
  },
  {
    id: "docker",
    label: "Docker",
    match: (entry) =>
      isBlobNamed(entry, "Dockerfile") ||
      isBlobNamed(entry, "docker-compose.yml") ||
      isBlobNamed(entry, "docker-compose.yaml") ||
      isBlobNamed(entry, ".dockerignore"),
  },
  {
    id: "github-actions",
    label: "GitHub Actions",
    match: (entry) =>
      entry.type === "blob" &&
      entry.path.startsWith(".github/workflows/") &&
      (entry.path.endsWith(".yml") || entry.path.endsWith(".yaml")),
  },
  {
    id: "terraform",
    label: "Terraform",
    match: (entry) =>
      entry.type === "blob" && (entry.path.endsWith(".tf") || entry.path.endsWith(".tfvars")),
  },
  {
    id: "kubernetes",
    label: "Kubernetes",
    match: (entry) =>
      (entry.type === "blob" &&
        (basename(entry.path) === "Chart.yaml" || basename(entry.path) === "values.yaml")) ||
      (entry.type === "blob" &&
        (entry.path.endsWith(".yml") || entry.path.endsWith(".yaml")) &&
        isInsideAny(entry.path, ["k8s/", "kubernetes/", "manifests/", "deploy/"])),
  },
  {
    id: "docs-folder",
    label: "docs/ folder",
    match: (entry) =>
      entry.path === "docs" ||
      entry.path === "documentation" ||
      entry.path.startsWith("docs/") ||
      entry.path.startsWith("documentation/"),
  },
  {
    id: "tests",
    label: "Tests",
    match: (entry) => isTestEntry(entry),
  },
];

export function detectTechSignals(tree: RepositoryTree): TechSignal[] {
  const buckets = new Map<TechSignalId, string[]>();

  for (const entry of tree.entries) {
    for (const definition of signalDefinitions) {
      if (!definition.match(entry)) continue;
      const evidence = buckets.get(definition.id) ?? [];
      if (evidence.length < EVIDENCE_LIMIT && !evidence.includes(entry.path)) {
        evidence.push(entry.path);
      }
      buckets.set(definition.id, evidence);
    }
  }

  return signalDefinitions
    .filter((definition) => buckets.has(definition.id))
    .map((definition) => ({
      id: definition.id,
      label: definition.label,
      evidence: buckets.get(definition.id) ?? [],
    }));
}

export function hasTechSignal(signals: TechSignal[], id: TechSignalId): boolean {
  return signals.some((signal) => signal.id === id);
}

export function findTechSignal(signals: TechSignal[], id: TechSignalId): TechSignal | undefined {
  return signals.find((signal) => signal.id === id);
}

function isBlobNamed(entry: RepositoryTreeEntry, name: string): boolean {
  return entry.type === "blob" && basename(entry.path) === name;
}

function basename(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? path : path.slice(index + 1);
}

function isInsideAny(path: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => path.startsWith(prefix));
}

function isTestEntry(entry: RepositoryTreeEntry): boolean {
  if (entry.type === "tree") {
    const name = basename(entry.path);
    return (
      name === "tests" ||
      name === "test" ||
      name === "__tests__" ||
      name === "spec" ||
      entry.path === "tests" ||
      entry.path === "test" ||
      entry.path === "__tests__" ||
      entry.path === "spec"
    );
  }

  if (entry.type !== "blob") return false;

  const name = basename(entry.path);

  if (
    name.endsWith(".test.ts") ||
    name.endsWith(".test.tsx") ||
    name.endsWith(".test.js") ||
    name.endsWith(".test.jsx") ||
    name.endsWith(".spec.ts") ||
    name.endsWith(".spec.tsx") ||
    name.endsWith(".spec.js") ||
    name.endsWith(".spec.jsx")
  ) {
    return true;
  }

  if (name.endsWith("_test.go") || name.endsWith("_test.py") || name.endsWith("_spec.rb")) {
    return true;
  }

  if (name.startsWith("test_") && name.endsWith(".py")) return true;

  return false;
}
