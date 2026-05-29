import type { RepositoryScore, ScoreCategory } from "@/modules/scoring-engine";
import type { ClassificationResult, ProjectType } from "@/modules/project-classifier/types";

export interface RepositoryLicense {
  key: string;
  name: string;
  spdxId: string | null;
  url: string | null;
}

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  homepageUrl: string | null;
  language: string | null;
  topics: string[];
  license: RepositoryLicense | null;
  defaultBranch: string;
  stars: number;
  forks: number;
  archived: boolean;
  fork: boolean;
  createdAt: string;
  updatedAt: string;
  pushedAt: string | null;
}

export interface RepositoryReadme {
  repositoryFullName: string;
  path: string;
  htmlUrl: string;
  content: string;
}

export type RepositoryReadmeState =
  | { status: "found"; readme: RepositoryReadme }
  | { status: "missing" }
  | { status: "unknown"; message: string };

export interface RepositoryTreeEntry {
  path: string;
  type: "blob" | "tree";
}

export interface RepositoryTree {
  repositoryFullName: string;
  entries: RepositoryTreeEntry[];
  truncated: boolean;
}

export type RepositoryTreeState =
  | { status: "found"; tree: RepositoryTree }
  | { status: "empty" }
  | { status: "truncated"; tree: RepositoryTree }
  | { status: "unknown"; message: string };

export type CheckStatus = "passed" | "failed" | "not-applicable" | "unknown";

export type CheckCategory =
  | "metadata"
  | "activity"
  | "status"
  | "documentation"
  | "buildability"
  | "ci"
  | "tests"
  | "containerization"
  | "infrastructure"
  | "security";

export interface CheckResult {
  id: string;
  label: string;
  category: CheckCategory;
  status: CheckStatus;
  evidence?: string;
}

export type HealthLabel =
  | "Portfolio-ready"
  | "Almost ready"
  | "Needs work"
  | "Experimental"
  | "Stale"
  | "Archived"
  | "Fork"
  | "Analyzing";

export type RecommendationPriority = "high" | "medium" | "low";

export interface Recommendation {
  id: string;
  checkId: string;
  title: string;
  description: string;
  priority: RecommendationPriority;
  /** Scoring category the underlying check contributes to, or null if uncategorized. */
  category: ScoreCategory | null;
  /**
   * Projected increase to the repository's total score if this single failing
   * check were resolved, given the active (profile × user) weights. 0 when the
   * impact cannot be computed (e.g. total is null).
   */
  scoreImpact: number;
}

export interface AnalysisResult {
  repository: Repository;
  checks: CheckResult[];
  analyzedAt: string;
  healthLabel: HealthLabel;
  score: RepositoryScore;
  passedCount: number;
  failedCount: number;
  unknownCount: number;
  missingSignals: string[];
  recommendations: Recommendation[];
  classification: ClassificationResult;
  classificationOverride?: ProjectType;
}

export type { CategoryScore, RepositoryScore, ScoreCategory } from "@/modules/scoring-engine";
export type {
  ClassificationResult,
  Confidence,
  ProjectType,
} from "@/modules/project-classifier/types";
