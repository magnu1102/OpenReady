import type { AnalysisResult } from "@/types";
import type { TechSignal } from "@/modules/analyzer-core";
import { PROJECT_TYPE_LABELS } from "@/modules/project-classifier";
import { rolePreset, scoreRepoForRole, type RoleId } from "./roles";

export type { RoleId, RolePreset, RoleRelevance } from "./roles";
export {
  ROLE_PRESETS,
  ROLE_LABELS,
  SELECTABLE_ROLES,
  rolePreset,
  scoreRepoForRole,
  suggestRole,
} from "./roles";

/** Default number of repositories surfaced in the featured list. */
export const DEFAULT_FEATURED_LIMIT = 6;

export interface FeaturedRepo {
  analysis: AnalysisResult;
  relevance: number;
  reasons: string[];
  /** True when the repo is in the list because the user explicitly pinned it. */
  pinned: boolean;
}

/**
 * Rank repositories for a role and return the ones to feature. Forks and
 * archived repos are excluded from the automatic list, but the `overrides` map
 * (repoId -> include?) lets the user force-include (pin) or force-exclude
 * (unpin) any repository on top of the automatic selection.
 */
export function selectFeatured(
  analyses: AnalysisResult[],
  signalsById: Record<string, TechSignal[]>,
  role: RoleId,
  overrides: Record<string, boolean> = {},
  limit: number = DEFAULT_FEATURED_LIMIT,
): FeaturedRepo[] {
  const ranked = analyses
    .map((analysis) => {
      const signals = signalsById[analysis.repository.id] ?? [];
      const { relevance, reasons } = scoreRepoForRole(analysis, signals, role);
      return { analysis, relevance, reasons };
    })
    .sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      return a.analysis.repository.fullName.localeCompare(b.analysis.repository.fullName);
    });

  const result: FeaturedRepo[] = [];
  for (const entry of ranked) {
    const id = entry.analysis.repository.id;
    const override = overrides[id];
    if (override === false) continue; // explicitly unpinned

    const eligible = !entry.analysis.repository.fork && !entry.analysis.repository.archived;
    const include = override === true || eligible;
    if (!include) continue;

    result.push({ ...entry, pinned: override === true });
  }

  // Pinned repos always survive the limit; auto picks fill the rest in order.
  const pinned = result.filter((repo) => repo.pinned);
  const auto = result.filter((repo) => !repo.pinned);
  return [...pinned, ...auto].slice(0, Math.max(limit, pinned.length));
}

export interface CvEntry {
  repoId: string;
  name: string;
  bullets: string[];
}

/**
 * Generate résumé bullet points for each featured repo. Every bullet is built
 * only from facts already present in the analysis — no invented metrics.
 */
export function buildCvBullets(featured: FeaturedRepo[], role: RoleId): CvEntry[] {
  const preset = rolePreset(role);
  return featured.map(({ analysis }) => {
    const repo = analysis.repository;
    const typeLabel = PROJECT_TYPE_LABELS[analysis.classification.type];
    const bullets: string[] = [];

    const lead = repo.language
      ? `Built ${typeLabel.toLowerCase()} in ${repo.language}`
      : `Built ${typeLabel.toLowerCase()}`;
    const purpose = repo.description?.trim();
    bullets.push(purpose ? `${lead} — ${stripTrailingPeriod(purpose)}.` : `${lead}.`);

    const sigs = signalsOf(analysis);
    const hasSig = (id: TechSignal["id"]) => sigs.some((signal) => signal.id === id);
    const engineering: string[] = [];
    if (hasSig("tests")) engineering.push("automated tests");
    if (hasSig("github-actions")) engineering.push("CI via GitHub Actions");
    if (hasSig("docker")) engineering.push("Docker packaging");
    if (engineering.length > 0) {
      bullets.push(`Engineered with ${joinList(engineering)}.`);
    }

    if (analysis.score.total !== null) {
      const stars = repo.stars > 0 ? ` and ${formatStars(repo.stars)}` : "";
      bullets.push(`Maintained an OpenReady health score of ${analysis.score.total}/100${stars}.`);
    }

    if (preset.id !== "generalist" && relevantStack(analysis, preset.techSignals).length > 0) {
      bullets.push(
        `Relevant ${preset.label} stack: ${relevantStack(analysis, preset.techSignals).join(", ")}.`,
      );
    }

    return { repoId: repo.id, name: repo.name, bullets };
  });
}

export interface TalkingPoints {
  repoId: string;
  name: string;
  highlights: string[];
  likelyQuestions: string[];
  gapsToOwn: string[];
}

/** Interview prep per repository: what to highlight, likely questions, and gaps to own. */
export function buildTalkingPoints(
  analysis: AnalysisResult,
  techSignals: TechSignal[],
): TalkingPoints {
  const repo = analysis.repository;
  const typeLabel = PROJECT_TYPE_LABELS[analysis.classification.type];

  const highlights: string[] = [];
  const strongest = analysis.score.categories.find(
    (category) => category.category === analysis.score.strongestCategory,
  );
  if (strongest && strongest.score !== null) {
    highlights.push(`Strongest area: ${strongest.label} (${strongest.score}/100).`);
  }
  if (techSignals.length > 0) {
    highlights.push(`Tech stack: ${techSignals.map((signal) => signal.label).join(", ")}.`);
  }
  if (analysis.hiddenGem.isHiddenGem) {
    highlights.push("A hidden gem — strong work that is currently under-promoted.");
  }
  if (highlights.length === 0) {
    highlights.push(`A ${typeLabel.toLowerCase()} worth walking through end to end.`);
  }

  const likelyQuestions = [
    `What problem does ${repo.name} solve, and why did you build it this way?`,
    `Walk me through the architecture of this ${typeLabel.toLowerCase()}.`,
    techSignals.some((s) => s.id === "tests")
      ? "How do you test it, and what is covered?"
      : "How would you add a test suite to this project?",
  ];

  const gapsToOwn = analysis.recommendations
    .slice(0, 3)
    .map((recommendation) => recommendation.title);
  if (gapsToOwn.length === 0 && analysis.missingSignals.length > 0) {
    gapsToOwn.push(...analysis.missingSignals.slice(0, 3));
  }

  return { repoId: repo.id, name: repo.name, highlights, likelyQuestions, gapsToOwn };
}

// Tech signals aren't stored on the analysis, so CV bullets derive them from
// passed checks: a passed `tests-present`/`github-actions`/`dockerfile` check
// is equivalent evidence and keeps buildCvBullets free of tree state.
function signalsOf(analysis: AnalysisResult): TechSignal[] {
  const map: { checkId: string; id: TechSignal["id"]; label: string }[] = [
    { checkId: "tests-present", id: "tests", label: "Tests" },
    { checkId: "github-actions", id: "github-actions", label: "GitHub Actions" },
    { checkId: "dockerfile", id: "docker", label: "Docker" },
  ];
  return map
    .filter(({ checkId }) =>
      analysis.checks.some((check) => check.id === checkId && check.status === "passed"),
    )
    .map(({ id, label }) => ({ id, label, evidence: [] }));
}

function relevantStack(analysis: AnalysisResult, signalIds: TechSignal["id"][]): string[] {
  const signals = signalsOf(analysis);
  const labels = signals
    .filter((signal) => signalIds.includes(signal.id))
    .map((signal) => signal.label);
  if (analysis.repository.language) labels.unshift(analysis.repository.language);
  return Array.from(new Set(labels));
}

function joinList(values: string[]): string {
  if (values.length <= 1) return values.join("");
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function formatStars(stars: number): string {
  return stars === 1 ? "1 GitHub star" : `${stars} GitHub stars`;
}

function stripTrailingPeriod(value: string): string {
  return value.replace(/\.+$/, "");
}
