import type { CheckResult } from "@/types";

export type ScoreCategory =
  | "documentation"
  | "presentation"
  | "buildability"
  | "maintainability"
  | "testing-ci"
  | "deployment-operations"
  | "metadata-discoverability"
  | "security";

export interface CategoryScore {
  category: ScoreCategory;
  label: string;
  score: number | null;
  passed: number;
  failed: number;
  applicable: number;
  weight: number;
  contributingCheckIds: string[];
}

export interface RepositoryScore {
  total: number | null;
  categories: CategoryScore[];
  weakestCategory: ScoreCategory | null;
  strongestCategory: ScoreCategory | null;
}

interface CategoryDefinition {
  id: ScoreCategory;
  label: string;
  match: (check: CheckResult) => boolean;
}

const PRESENTATION_CHECK_IDS = new Set([
  "homepage",
  "readme-screenshots-demo",
  "release-artifact-link-in-readme",
]);

const categoryDefinitions: CategoryDefinition[] = [
  {
    id: "documentation",
    label: "Documentation",
    match: (check) => check.category === "documentation" && !PRESENTATION_CHECK_IDS.has(check.id),
  },
  {
    id: "presentation",
    label: "Presentation",
    match: (check) => PRESENTATION_CHECK_IDS.has(check.id),
  },
  {
    id: "buildability",
    label: "Buildability",
    match: (check) => check.category === "buildability",
  },
  {
    id: "maintainability",
    label: "Maintainability",
    match: (check) => check.category === "activity" || check.category === "status",
  },
  {
    id: "testing-ci",
    label: "Testing & CI",
    match: (check) => check.category === "tests" || check.category === "ci",
  },
  {
    id: "deployment-operations",
    label: "Deployment & operations",
    match: (check) => check.category === "containerization" || check.category === "infrastructure",
  },
  {
    id: "metadata-discoverability",
    label: "Metadata & discoverability",
    match: (check) => check.category === "metadata",
  },
  {
    id: "security",
    label: "Security hygiene",
    match: (check) => check.category === "security",
  },
];

/**
 * Resolve which scoring category a check contributes to, mirroring the matchers
 * in {@link categoryDefinitions}. Returns null when no category claims the check
 * (e.g. status-only checks like `not-archived`).
 */
export function categoryForCheck(check: CheckResult): ScoreCategory | null {
  return categoryDefinitions.find((definition) => definition.match(check))?.id ?? null;
}

/** Ordered category id + label pairs, for UIs that let users tune weights. */
export const SCORE_CATEGORIES: ReadonlyArray<{ id: ScoreCategory; label: string }> =
  categoryDefinitions.map(({ id, label }) => ({ id, label }));

export function scoreChecks(
  checks: CheckResult[],
  weights: Partial<Record<ScoreCategory, number>> = {},
): RepositoryScore {
  const categories: CategoryScore[] = categoryDefinitions.map((definition) => {
    const contributing = checks.filter(definition.match);
    const passed = contributing.filter((check) => check.status === "passed").length;
    const failed = contributing.filter((check) => check.status === "failed").length;
    const applicable = passed + failed;
    const score = applicable === 0 ? null : Math.round((passed / applicable) * 100);
    const weight = weights[definition.id] ?? 1;

    return {
      category: definition.id,
      label: definition.label,
      score,
      passed,
      failed,
      applicable,
      weight,
      contributingCheckIds: contributing.map((check) => check.id),
    };
  });

  const applicableCategories = categories.filter(
    (category): category is CategoryScore & { score: number } => category.score !== null,
  );

  const weightSum = applicableCategories.reduce((sum, category) => sum + category.weight, 0);
  const total =
    applicableCategories.length === 0 || weightSum === 0
      ? null
      : Math.round(
          applicableCategories.reduce(
            (sum, category) => sum + category.score * category.weight,
            0,
          ) / weightSum,
        );

  const ranked = [...applicableCategories].sort((a, b) => a.score - b.score);
  const weakestCategory = ranked.length > 0 ? ranked[0].category : null;
  const strongestCategory = ranked.length > 0 ? ranked[ranked.length - 1].category : null;

  return { total, categories, weakestCategory, strongestCategory };
}
