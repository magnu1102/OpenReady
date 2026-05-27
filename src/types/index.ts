export interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
  forks: number;
  archived: boolean;
  fork: boolean;
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
