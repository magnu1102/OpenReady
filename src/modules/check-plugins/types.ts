import type { CheckCategory, CheckStatus, Repository } from "@/types";
import type { TechSignal } from "@/modules/analyzer-core";

/** Custom checks may use any built-in category, or the dedicated `custom` bucket. */
export type CustomCheckCategory = CheckCategory | "custom";

/**
 * A fully serializable, read-only view of one repository handed to custom checks.
 * It contains plain data only (no live handles, no network, no app state) so it can
 * be structured-cloned into a Web Worker and produces identical results everywhere.
 */
export interface CheckSnapshot {
  repository: Repository;
  readme: { found: boolean; content: string };
  tree: { available: boolean; truncated: boolean; paths: string[] };
  techSignals: TechSignal[];
}

/** The snapshot plus pure helper methods, passed to a plugin's `run`. */
export interface CheckContext extends CheckSnapshot {
  /** True if any tree path matches `pattern` (a glob string or RegExp). */
  hasPath(pattern: string | RegExp): boolean;
  /** True if the README content matches `pattern`. */
  readmeMatches(pattern: RegExp): boolean;
  /** True if the repository has `name` as a topic (case-insensitive). */
  hasTopic(name: string): boolean;
}

/** What a custom check returns. Kept tiny so checks are easy to author. */
export interface CustomCheckOutput {
  status: CheckStatus;
  evidence?: string;
}

/** A single custom check. `id` must be namespaced as `vendor/check-name`. */
export interface CheckPlugin {
  id: string;
  label: string;
  category?: CustomCheckCategory;
  run: (context: CheckContext) => CustomCheckOutput;
}

/** Pack manifest — see schemas/openready.pack.v1.schema.json. */
export interface PackManifest {
  schema: "openready.pack.v1";
  name: string;
  version: string;
  author?: string;
  description?: string;
  checkIds: string[];
}

/** A pack bundles a manifest with its executable checks. */
export interface CheckPack {
  manifest: PackManifest;
  checks: CheckPlugin[];
}

/**
 * The result of running one custom check. Shaped like a built-in `CheckResult`
 * (so UIs can render it the same way) but tagged with its plugin origin and kept
 * in a separate `customChecks` collection — it never alters the built-in score.
 */
export interface CustomCheckResult {
  id: string;
  label: string;
  category: CustomCheckCategory;
  status: CheckStatus;
  evidence?: string;
  source: "plugin";
  pluginId: string;
}
