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

export type CheckStatus = "passed" | "failed" | "not-applicable" | "unknown";

export type CheckCategory = "metadata" | "activity" | "status" | "documentation";

export interface CheckResult {
  id: string;
  label: string;
  category: CheckCategory;
  status: CheckStatus;
  evidence?: string;
}

export type HealthLabel =
  | "Strong start"
  | "Needs README"
  | "Needs metadata"
  | "Needs presentation"
  | "Stale"
  | "Archived"
  | "Fork";

export interface AnalysisResult {
  repository: Repository;
  checks: CheckResult[];
  analyzedAt: string;
  healthLabel: HealthLabel;
  passedCount: number;
  failedCount: number;
  unknownCount: number;
  missingSignals: string[];
}
