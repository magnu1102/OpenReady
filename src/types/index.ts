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

export type CheckStatus = "passed" | "failed" | "not-applicable" | "unknown";

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  evidence?: string;
}

export interface AnalysisResult {
  repository: Repository;
  checks: CheckResult[];
  scoredAt: string;
}
