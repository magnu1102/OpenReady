import type { AnalysisResult } from "@/types";
import type { ProjectType } from "@/modules/project-classifier";
import type { TechSignal, TechSignalId } from "@/modules/analyzer-core";

export type RoleId =
  | "frontend"
  | "backend"
  | "full-stack"
  | "mobile"
  | "devops"
  | "data"
  | "generalist";

export interface RolePreset {
  id: RoleId;
  label: string;
  blurb: string;
  /** Project types that count as on-target for this role. */
  projectTypes: ProjectType[];
  /** Tech signals that reinforce the role. */
  techSignals: TechSignalId[];
  /** Primary repository languages (matched case-insensitively). */
  languages: string[];
}

// Relevance scoring weights. base = score.total; bonuses are additive on top.
const TYPE_BONUS = 15;
const SIGNAL_BONUS = 8;
const SIGNAL_BONUS_CAP = 24;
const LANGUAGE_BONUS = 10;
const HIDDEN_GEM_BONUS = 5;

export const ROLE_PRESETS: RolePreset[] = [
  {
    id: "frontend",
    label: "Frontend Engineer",
    blurb: "UI-focused work: web apps, component systems, and presentation.",
    projectTypes: ["frontend", "full-stack"],
    techSignals: ["node"],
    languages: ["typescript", "javascript", "html", "css", "vue", "svelte"],
  },
  {
    id: "backend",
    label: "Backend Engineer",
    blurb: "Services, APIs, and libraries with an emphasis on testing and operations.",
    projectTypes: ["backend", "cli", "library"],
    techSignals: ["node", "python", "go", "rust", "java-gradle", "docker"],
    languages: ["python", "go", "rust", "java", "ruby", "c#", "php", "typescript"],
  },
  {
    id: "full-stack",
    label: "Full-stack Engineer",
    blurb: "End-to-end products spanning frontend and backend.",
    projectTypes: ["full-stack", "frontend", "backend"],
    techSignals: ["node", "docker"],
    languages: ["typescript", "javascript", "python"],
  },
  {
    id: "mobile",
    label: "Mobile Engineer",
    blurb: "Native and cross-platform mobile applications.",
    projectTypes: ["frontend"],
    techSignals: ["android"],
    languages: ["kotlin", "swift", "java", "dart", "objective-c"],
  },
  {
    id: "devops",
    label: "DevOps / Platform Engineer",
    blurb: "CI/CD, containers, infrastructure as code, and orchestration.",
    projectTypes: ["backend"],
    techSignals: ["docker", "github-actions", "terraform", "kubernetes"],
    languages: ["hcl", "shell", "go", "dockerfile"],
  },
  {
    id: "data",
    label: "Data / ML Engineer",
    blurb: "Data pipelines, analysis, and machine-learning projects.",
    projectTypes: ["library", "cli"],
    techSignals: ["python"],
    languages: ["python", "jupyter notebook", "r"],
  },
  {
    id: "generalist",
    label: "Generalist Developer",
    blurb: "A broad mix of work — no single specialization stands out.",
    projectTypes: [],
    techSignals: [],
    languages: [],
  },
];

export const ROLE_LABELS: Record<RoleId, string> = ROLE_PRESETS.reduce(
  (acc, preset) => {
    acc[preset.id] = preset.label;
    return acc;
  },
  {} as Record<RoleId, string>,
);

/** Selectable presets in the UI (generalist last, as a neutral fallback). */
export const SELECTABLE_ROLES: RoleId[] = ROLE_PRESETS.map((preset) => preset.id);

export function rolePreset(role: RoleId): RolePreset {
  return ROLE_PRESETS.find((preset) => preset.id === role) ?? ROLE_PRESETS[ROLE_PRESETS.length - 1];
}

export interface RoleRelevance {
  /** Total relevance used for ranking (base score plus role bonuses). */
  relevance: number;
  /** Bonus contribution alone (relevance minus the base score). */
  bonus: number;
  reasons: string[];
}

/**
 * Score how well a single repository fits a role. Deterministic: it only reads
 * data already present in the analysis plus the repository's detected tech
 * signals. `base` is the repo's total score so stronger repos rank higher
 * within a role; bonuses reward type, tech, language, and hidden-gem matches.
 */
export function scoreRepoForRole(
  analysis: AnalysisResult,
  techSignals: TechSignal[],
  role: RoleId,
): RoleRelevance {
  const preset = rolePreset(role);
  const base = analysis.score.total ?? 0;
  const reasons: string[] = [];
  let bonus = 0;

  if (preset.projectTypes.includes(analysis.classification.type)) {
    bonus += TYPE_BONUS;
    reasons.push(`Detected as a ${analysis.classification.type} project`);
  }

  const matchedSignals = techSignals.filter((signal) => preset.techSignals.includes(signal.id));
  if (matchedSignals.length > 0) {
    bonus += Math.min(SIGNAL_BONUS_CAP, matchedSignals.length * SIGNAL_BONUS);
    reasons.push(`Uses ${matchedSignals.map((signal) => signal.label).join(", ")}`);
  }

  const language = analysis.repository.language?.toLowerCase();
  if (language && preset.languages.includes(language)) {
    bonus += LANGUAGE_BONUS;
    reasons.push(`Written in ${analysis.repository.language}`);
  }

  if (analysis.hiddenGem.isHiddenGem) {
    bonus += HIDDEN_GEM_BONUS;
    reasons.push("Hidden gem — strong but under-promoted");
  }

  return { relevance: base + bonus, bonus, reasons };
}

/**
 * Suggest the role that best fits the user's repository mix by summing each
 * specific role's bonus contribution across all repositories. Falls back to
 * "generalist" when no specialization accumulates any advantage.
 */
export function suggestRole(
  analyses: AnalysisResult[],
  signalsById: Record<string, TechSignal[]>,
): RoleId {
  let best: RoleId = "generalist";
  let bestBonus = 0;

  for (const preset of ROLE_PRESETS) {
    if (preset.id === "generalist") continue;
    const total = analyses.reduce((sum, analysis) => {
      const signals = signalsById[analysis.repository.id] ?? [];
      return sum + scoreRepoForRole(analysis, signals, preset.id).bonus;
    }, 0);
    if (total > bestBonus) {
      bestBonus = total;
      best = preset.id;
    }
  }

  return best;
}
