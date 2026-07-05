/**
 * Score badge generation from an `openready.export.v1` JSON summary.
 *
 * Pure module: no I/O, fully deterministic. The CLI runner (src/cli/badge.ts)
 * and the composite GitHub Action both consume it, and the desktop app can
 * reuse it later (e.g. a "Copy badge" export). Validation is structural only —
 * exports are produced by our own export-engine and Ajv-validated against the
 * schema in tests, so bundling a JSON Schema validator here would only bloat
 * the shipped CLI bundle.
 */

export type BadgeColor = "brightgreen" | "green" | "yellow" | "red" | "lightgrey";

export interface BadgeData {
  label: string;
  message: string;
  color: BadgeColor;
}

export type BadgeResult =
  | { ok: true; badge: BadgeData }
  | { ok: false; error: string; code: "invalid-input" | "repo-not-found" };

export interface BadgeOptions {
  /** Badge a single repository (case-insensitive `name` or `fullName` match). */
  repo?: string | null;
  /** Badge label text. Defaults to "openready". */
  label?: string | null;
}

const DEFAULT_LABEL = "openready";

/** Mirrors the health tiers: Portfolio-ready / Almost ready / Needs work / Experimental. */
export function scoreToColor(total: number | null): BadgeColor {
  if (total === null) return "lightgrey";
  if (total >= 85) return "brightgreen";
  if (total >= 70) return "green";
  if (total >= 50) return "yellow";
  return "red";
}

export function badgeFromExport(summary: unknown, options: BadgeOptions = {}): BadgeResult {
  const repositories = readRepositories(summary);
  if (repositories === null) {
    return {
      ok: false,
      code: "invalid-input",
      error: "expected an openready.export.v1 JSON summary (from `analyze --format json`).",
    };
  }

  let selected = repositories;
  if (options.repo) {
    const needle = options.repo.toLowerCase();
    selected = repositories.filter(
      (repository) =>
        repository.name.toLowerCase() === needle || repository.fullName.toLowerCase() === needle,
    );
    if (selected.length === 0) {
      return {
        ok: false,
        code: "repo-not-found",
        error: `no repository matched --repo ${options.repo} in the report.`,
      };
    }
  }

  const totals = selected
    .map((repository) => repository.total)
    .filter((total): total is number => total !== null);
  const score =
    totals.length === 0
      ? null
      : Math.round(totals.reduce((sum, total) => sum + total, 0) / totals.length);

  return {
    ok: true,
    badge: {
      label: options.label?.trim() || DEFAULT_LABEL,
      message: score === null ? "unavailable" : `${score}/100`,
      color: scoreToColor(score),
    },
  };
}

/** shields.io endpoint JSON (https://shields.io/badges/endpoint-badge). */
export function renderBadgeEndpoint(badge: BadgeData): string {
  const endpoint = {
    schemaVersion: 1,
    label: badge.label,
    message: badge.message,
    color: badge.color,
  };
  return `${JSON.stringify(endpoint, null, 2)}\n`;
}

const COLOR_HEX: Record<BadgeColor, string> = {
  brightgreen: "#4c1",
  green: "#97ca00",
  yellow: "#dfb317",
  red: "#e05d44",
  lightgrey: "#9f9f9f",
};

/**
 * Flat-style SVG badge, rendered without third-party badge libraries. Text
 * width uses a fixed per-character heuristic instead of font measurement, so
 * the output is deterministic (and snapshot-testable) on every platform.
 */
export function renderBadgeSvg(badge: BadgeData): string {
  const labelWidth = textWidth(badge.label);
  const messageWidth = textWidth(badge.message);
  const width = labelWidth + messageWidth;
  const hex = COLOR_HEX[badge.color];
  const label = escapeXml(badge.label);
  const message = escapeXml(badge.message);
  const title = `${label}: ${message}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${title}">
  <title>${title}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${width}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${messageWidth}" height="20" fill="${hex}"/>
    <rect width="${width}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + messageWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${message}</text>
    <text x="${labelWidth + messageWidth / 2}" y="14">${message}</text>
  </g>
</svg>
`;
}

interface RepositoryScore {
  name: string;
  fullName: string;
  total: number | null;
}

/** Structural read of the export; returns null when the shape is not ours. */
function readRepositories(summary: unknown): RepositoryScore[] | null {
  if (typeof summary !== "object" || summary === null) return null;
  const record = summary as Record<string, unknown>;
  if (record.schema !== "openready.export.v1") return null;
  if (!Array.isArray(record.repositories)) return null;

  const repositories: RepositoryScore[] = [];
  for (const entry of record.repositories) {
    if (typeof entry !== "object" || entry === null) return null;
    const repo = entry as Record<string, unknown>;
    if (typeof repo.name !== "string" || typeof repo.fullName !== "string") return null;
    const score = repo.score as Record<string, unknown> | null | undefined;
    const total = score && typeof score.total === "number" ? score.total : null;
    repositories.push({ name: repo.name, fullName: repo.fullName, total });
  }
  return repositories;
}

/** Fixed 6.5px-per-character heuristic plus 6px padding per side (Verdana 11px). */
function textWidth(text: string): number {
  return Math.round(text.length * 6.5) + 12;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
