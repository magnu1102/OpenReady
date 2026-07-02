import type { ScoreCategory } from "@/modules/scoring-engine";

const SCORE_CATEGORIES: ScoreCategory[] = [
  "documentation",
  "presentation",
  "buildability",
  "maintainability",
  "testing-ci",
  "deployment-operations",
  "metadata-discoverability",
  "security",
];

/** A shareable team profile — see schemas/openready.profile.v1.schema.json. */
export interface TeamProfile {
  schema: "openready.profile.v1";
  name: string;
  categoryWeights: Partial<Record<ScoreCategory, number>>;
  thresholds?: { failUnder?: number };
  role?: string;
  enabledPacks?: string[];
}

export type ProfileParse = { ok: true; profile: TeamProfile } | { ok: false; error: string };

/**
 * Structurally validates and normalizes a team profile (offline, no code execution).
 * Shared by the desktop import and the CLI's `--profile` flag so both agree on shape.
 */
export function parseProfile(value: unknown): ProfileParse {
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "Profile must be a JSON object." };
  }
  const raw = value as Record<string, unknown>;

  if (raw.schema !== "openready.profile.v1") {
    return { ok: false, error: 'Profile "schema" must be "openready.profile.v1".' };
  }
  if (typeof raw.name !== "string" || raw.name.trim().length === 0) {
    return { ok: false, error: 'Profile "name" is required.' };
  }

  const weights = normalizeWeights(raw.categoryWeights);
  if (weights === null) {
    return {
      ok: false,
      error: 'Profile "categoryWeights" must map known categories to numbers ≥ 0.',
    };
  }

  let thresholds: { failUnder?: number } | undefined;
  if (raw.thresholds !== undefined) {
    if (typeof raw.thresholds !== "object" || raw.thresholds === null) {
      return { ok: false, error: 'Profile "thresholds" must be an object.' };
    }
    const failUnder = (raw.thresholds as Record<string, unknown>).failUnder;
    if (failUnder !== undefined) {
      if (typeof failUnder !== "number" || failUnder < 0 || failUnder > 100) {
        return { ok: false, error: 'Profile "thresholds.failUnder" must be a number 0–100.' };
      }
      thresholds = { failUnder };
    } else {
      thresholds = {};
    }
  }

  if (raw.role !== undefined && typeof raw.role !== "string") {
    return { ok: false, error: 'Profile "role" must be a string.' };
  }
  if (
    raw.enabledPacks !== undefined &&
    (!Array.isArray(raw.enabledPacks) || !raw.enabledPacks.every((p) => typeof p === "string"))
  ) {
    return { ok: false, error: 'Profile "enabledPacks" must be an array of strings.' };
  }

  return {
    ok: true,
    profile: {
      schema: "openready.profile.v1",
      name: raw.name,
      categoryWeights: weights,
      thresholds,
      role: raw.role as string | undefined,
      enabledPacks: raw.enabledPacks as string[] | undefined,
    },
  };
}

function normalizeWeights(value: unknown): Partial<Record<ScoreCategory, number>> | null {
  if (typeof value !== "object" || value === null) return null;
  const entries = value as Record<string, unknown>;
  const weights: Partial<Record<ScoreCategory, number>> = {};
  for (const [key, raw] of Object.entries(entries)) {
    if (!SCORE_CATEGORIES.includes(key as ScoreCategory)) return null;
    if (typeof raw !== "number" || Number.isNaN(raw) || raw < 0) return null;
    weights[key as ScoreCategory] = raw;
  }
  return weights;
}

export { SCORE_CATEGORIES };
