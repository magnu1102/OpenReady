import { readFile, stat } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve, basename, join } from "node:path";
import { validatePackManifest } from "./validate";
import type { CheckPack, CheckPlugin } from "./types";

/**
 * Loads check packs from local paths for the CLI / GitHub Action (Node only — this
 * file is never imported by the desktop bundle). Each path may be:
 *   - a JS/MJS file whose default export is a `CheckPack` or `CheckPlugin[]`
 *   - a directory containing `openready-pack.json` plus an entry module
 *     (`index.mjs`, `index.js`, or `pack.mjs`).
 *
 * Trust note: this executes third-party code, exactly like importing a dependency.
 * The CLI only calls this when `--allow-plugins` is set.
 */
export async function loadPacks(paths: string[]): Promise<CheckPack[]> {
  const packs: CheckPack[] = [];
  for (const path of paths) {
    packs.push(await loadPack(path));
  }
  return packs;
}

async function loadPack(path: string): Promise<CheckPack> {
  const absolute = resolve(path);
  const stats = await stat(absolute).catch(() => null);
  if (!stats) throw new Error(`Plugin path not found: ${path}`);

  if (stats.isDirectory()) {
    const manifestRaw = await readFile(join(absolute, "openready-pack.json"), "utf8").catch(() => {
      throw new Error(`Pack directory ${path} is missing openready-pack.json.`);
    });
    const validation = validatePackManifest(JSON.parse(manifestRaw));
    if (!validation.ok) throw new Error(`Invalid manifest in ${path}: ${validation.error}`);

    const entry = await firstExisting(absolute, ["index.mjs", "index.js", "pack.mjs"]);
    if (!entry) throw new Error(`Pack directory ${path} has no entry module (index.mjs/js).`);
    const checks = await importChecks(entry);
    return { manifest: validation.manifest, checks };
  }

  const checks = await importChecks(absolute);
  return {
    manifest: {
      schema: "openready.pack.v1",
      name: basename(absolute),
      version: "0.0.0",
      checkIds: checks.map((check) => check.id),
    },
    checks,
  };
}

async function importChecks(file: string): Promise<CheckPlugin[]> {
  const module = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
  const candidate = module.default ?? module.pack ?? module;

  if (isPack(candidate)) return candidate.checks;
  if (hasChecksArray(candidate)) return candidate.checks;
  if (Array.isArray(candidate) && candidate.every(isPlugin)) return candidate;

  throw new Error(`Module ${file} must default-export a CheckPack or an array of checks.`);
}

async function firstExisting(dir: string, names: string[]): Promise<string | null> {
  for (const name of names) {
    const candidate = join(dir, name);
    if (
      await stat(candidate)
        .then(() => true)
        .catch(() => false)
    )
      return candidate;
  }
  return null;
}

function isPlugin(value: unknown): value is CheckPlugin {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as CheckPlugin).id === "string" &&
    typeof (value as CheckPlugin).run === "function"
  );
}

function hasChecksArray(value: unknown): value is { checks: CheckPlugin[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { checks?: unknown }).checks) &&
    (value as { checks: unknown[] }).checks.every(isPlugin)
  );
}

function isPack(value: unknown): value is CheckPack {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as CheckPack).manifest === "object" &&
    hasChecksArray(value)
  );
}
