/**
 * Health tiers mirror chooseHealthLabel in analyzer-core: 85/70/50 cutoffs.
 * The brand accent never encodes a score — tiers map to the semantic data
 * colors (see docs/design-system.md).
 */
export type ScoreTier = "success" | "accent" | "warn" | "danger" | "none";

export function scoreTier(value: number | null): ScoreTier {
  if (value === null) return "none";
  if (value >= 85) return "success";
  if (value >= 70) return "accent";
  if (value >= 50) return "warn";
  return "danger";
}

export const scoreTierVar: Record<ScoreTier, string> = {
  success: "var(--success)",
  accent: "var(--accent)",
  warn: "var(--warn)",
  danger: "var(--danger)",
  none: "var(--border-subtle)",
};
