import type { Repository, RepositoryTreeEntry, RepositoryTreeState } from "@/types";
import type { TechSignal } from "@/modules/analyzer-core/tech-stack";
import { hasTechSignal } from "@/modules/analyzer-core/tech-stack";
import type { ClassificationResult, Confidence, ProjectType } from "./types";

export type { ClassificationResult, Confidence, ProjectType } from "./types";
export { PROJECT_TYPE_LABELS, SELECTABLE_PROJECT_TYPES } from "./types";
export { profileFor } from "./profiles";
export type { ClassificationProfile } from "./profiles";

interface Signal {
  type: Exclude<ProjectType, "unknown" | "full-stack">;
  reason: string;
}

export function classifyRepository(
  _repository: Repository,
  treeState: RepositoryTreeState | undefined,
  techSignals: TechSignal[],
  override?: ProjectType,
): ClassificationResult {
  const detected = autoDetect(treeState, techSignals);

  if (override && override !== detected.type) {
    return {
      ...detected,
      type: override,
      overridden: true,
    };
  }

  return detected;
}

function autoDetect(
  treeState: RepositoryTreeState | undefined,
  techSignals: TechSignal[],
): ClassificationResult {
  const entries = readableEntries(treeState);
  if (!entries) {
    return {
      type: "unknown",
      detectedType: "unknown",
      confidence: "low",
      reasons: ["Repository file tree is unavailable."],
      runnerUp: null,
      overridden: false,
    };
  }

  const paths = new Set(entries.map((entry) => entry.path));
  const tops = topLevelDirs(entries);

  const collected: Signal[] = [];
  collected.push(...frontendSignals(paths));
  collected.push(...backendSignals(paths, tops, techSignals));
  collected.push(...desktopSignals(paths, tops));
  collected.push(...cliSignals(paths, tops, techSignals));
  collected.push(...librarySignals(paths, tops, techSignals));

  const scores = new Map<ProjectType, string[]>();
  for (const signal of collected) {
    const list = scores.get(signal.type) ?? [];
    list.push(signal.reason);
    scores.set(signal.type, list);
  }

  if ((scores.get("desktop")?.length ?? 0) >= 1) {
    scores.delete("frontend");
  }

  const frontendCount = scores.get("frontend")?.length ?? 0;
  const backendCount = scores.get("backend")?.length ?? 0;

  if (frontendCount >= 1 && backendCount >= 1) {
    const reasons = [...(scores.get("frontend") ?? []), ...(scores.get("backend") ?? [])];
    scores.set("full-stack", reasons);
    scores.delete("frontend");
    scores.delete("backend");
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1].length - a[1].length);

  if (ranked.length === 0) {
    return {
      type: "unknown",
      detectedType: "unknown",
      confidence: "low",
      reasons: ["No identifying files were detected in the repository tree."],
      runnerUp: null,
      overridden: false,
    };
  }

  const [winner, winnerReasons] = ranked[0];
  const runnerUp = ranked[1] ?? null;
  const lead = winnerReasons.length - (runnerUp ? runnerUp[1].length : 0);
  const confidence: Confidence = lead >= 2 ? "high" : lead === 1 ? "medium" : "low";

  return {
    type: winner,
    detectedType: winner,
    confidence,
    reasons: winnerReasons.slice(0, 4),
    runnerUp: runnerUp ? runnerUp[0] : null,
    overridden: false,
  };
}

function readableEntries(treeState: RepositoryTreeState | undefined): RepositoryTreeEntry[] | null {
  if (!treeState) return null;
  if (treeState.status === "found" || treeState.status === "truncated") {
    return treeState.tree.entries;
  }
  return null;
}

function topLevelDirs(entries: RepositoryTreeEntry[]): Set<string> {
  const dirs = new Set<string>();
  for (const entry of entries) {
    const slash = entry.path.indexOf("/");
    if (entry.type === "tree" && slash === -1) {
      dirs.add(entry.path);
    } else if (slash > 0) {
      dirs.add(entry.path.slice(0, slash));
    }
  }
  return dirs;
}

function hasFile(paths: Set<string>, name: string): boolean {
  return paths.has(name);
}

function anyPathMatches(paths: Set<string>, predicate: (path: string) => boolean): boolean {
  for (const path of paths) {
    if (predicate(path)) return true;
  }
  return false;
}

function frontendSignals(paths: Set<string>): Signal[] {
  const signals: Signal[] = [];

  if (hasFile(paths, "index.html")) {
    signals.push({ type: "frontend", reason: "index.html at the repository root" });
  }

  const frameworkConfigs = [
    "vite.config.ts",
    "vite.config.js",
    "vite.config.mjs",
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "astro.config.mjs",
    "astro.config.ts",
    "svelte.config.js",
    "svelte.config.ts",
    "angular.json",
    "nuxt.config.ts",
    "nuxt.config.js",
    "gatsby-config.js",
    "gatsby-config.ts",
    "remix.config.js",
    "remix.config.ts",
  ];
  const framework = frameworkConfigs.find((name) => hasFile(paths, name));
  if (framework) {
    signals.push({ type: "frontend", reason: `${framework} present` });
  }

  if (anyPathMatches(paths, (path) => path.startsWith("public/"))) {
    signals.push({ type: "frontend", reason: "public/ asset directory" });
  }

  if (
    anyPathMatches(paths, (path) => path.startsWith("src/components/")) ||
    anyPathMatches(paths, (path) => path.startsWith("src/pages/")) ||
    anyPathMatches(paths, (path) => path.startsWith("src/app/"))
  ) {
    signals.push({ type: "frontend", reason: "src/components or src/pages directory" });
  }

  return signals;
}

function backendSignals(
  paths: Set<string>,
  tops: Set<string>,
  techSignals: TechSignal[],
): Signal[] {
  const signals: Signal[] = [];

  if (hasFile(paths, "Procfile")) {
    signals.push({ type: "backend", reason: "Procfile present" });
  }

  for (const file of ["manage.py", "wsgi.py", "asgi.py"]) {
    if (hasFile(paths, file)) {
      signals.push({ type: "backend", reason: `${file} present` });
      break;
    }
  }

  if (hasFile(paths, "main.go") && hasTechSignal(techSignals, "go")) {
    signals.push({ type: "backend", reason: "main.go entry point" });
  }

  for (const dir of ["api", "server", "backend"]) {
    if (tops.has(dir)) {
      signals.push({ type: "backend", reason: `${dir}/ directory at root` });
      break;
    }
  }

  if (
    hasTechSignal(techSignals, "docker") &&
    (hasTechSignal(techSignals, "python") ||
      hasTechSignal(techSignals, "go") ||
      hasTechSignal(techSignals, "java-gradle")) &&
    !anyPathMatches(paths, (p) => p === "index.html") &&
    !hasFile(paths, "vite.config.ts")
  ) {
    signals.push({ type: "backend", reason: "Dockerfile with server-language manifest" });
  }

  return signals;
}

function desktopSignals(paths: Set<string>, tops: Set<string>): Signal[] {
  const signals: Signal[] = [];

  if (tops.has("src-tauri") || hasFile(paths, "tauri.conf.json")) {
    signals.push({ type: "desktop", reason: "Tauri configuration detected" });
  }

  if (
    hasFile(paths, "electron.js") ||
    hasFile(paths, "electron-builder.json") ||
    hasFile(paths, "electron-builder.yml") ||
    anyPathMatches(paths, (path) => path === "forge.config.js" || path === "forge.config.ts")
  ) {
    signals.push({ type: "desktop", reason: "Electron / Forge configuration detected" });
  }

  if (anyPathMatches(paths, (path) => path.endsWith(".iss"))) {
    signals.push({ type: "desktop", reason: "Inno Setup installer script present" });
  }

  return signals;
}

function cliSignals(paths: Set<string>, tops: Set<string>, techSignals: TechSignal[]): Signal[] {
  const signals: Signal[] = [];

  if (tops.has("bin")) {
    signals.push({ type: "cli", reason: "bin/ directory at root" });
  }

  if (tops.has("cmd") && hasTechSignal(techSignals, "go")) {
    signals.push({ type: "cli", reason: "cmd/ directory with Go module" });
  }

  if (
    hasFile(paths, "src/main.rs") &&
    hasTechSignal(techSignals, "rust") &&
    !anyPathMatches(paths, (path) => path === "src-tauri" || path.startsWith("src-tauri/"))
  ) {
    signals.push({ type: "cli", reason: "Rust main.rs without Tauri shell" });
  }

  return signals;
}

function librarySignals(
  paths: Set<string>,
  tops: Set<string>,
  techSignals: TechSignal[],
): Signal[] {
  const signals: Signal[] = [];

  const hasManifest =
    hasTechSignal(techSignals, "node") ||
    hasTechSignal(techSignals, "python") ||
    hasTechSignal(techSignals, "rust") ||
    hasTechSignal(techSignals, "go");

  if (!hasManifest) return signals;

  if (tops.has("lib")) {
    signals.push({ type: "library", reason: "lib/ directory at root" });
  }

  const indicatesExports =
    hasFile(paths, "src/index.ts") ||
    hasFile(paths, "src/index.js") ||
    hasFile(paths, "src/lib.rs");
  const noAppHints =
    !hasFile(paths, "index.html") &&
    !tops.has("api") &&
    !tops.has("server") &&
    !tops.has("bin") &&
    !tops.has("src-tauri") &&
    !hasFile(paths, "manage.py");

  if (indicatesExports && noAppHints) {
    signals.push({ type: "library", reason: "package entry point without app shell" });
  }

  return signals;
}
