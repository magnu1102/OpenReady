import type {
  AnalysisResult,
  CheckCategory,
  CheckResult,
  CheckStatus,
  HealthLabel,
  Repository,
  RepositoryReadmeState,
} from "@/types";

const RECENT_ACTIVITY_DAYS = 365;

type ReadmeSectionId =
  | "purpose"
  | "setup"
  | "usage"
  | "screenshots-demo"
  | "tech-stack"
  | "testing"
  | "roadmap";

interface ReadmeSectionDefinition {
  id: ReadmeSectionId;
  label: string;
  missingSignal: string;
  patterns: RegExp[];
}

const readmeSections: ReadmeSectionDefinition[] = [
  {
    id: "purpose",
    label: "README explains project purpose",
    missingSignal: "README purpose is unclear",
    patterns: [/^#{1,3}\s+(about|overview|introduction|purpose|what is)/im],
  },
  {
    id: "setup",
    label: "README includes setup instructions",
    missingSignal: "No setup instructions found",
    patterns: [/^#{1,3}\s+(installation|install|setup|getting started|quickstart|run locally)/im],
  },
  {
    id: "usage",
    label: "README includes usage guidance",
    missingSignal: "No usage guidance found",
    patterns: [/^#{1,3}\s+(usage|examples?|how to use)/im],
  },
  {
    id: "screenshots-demo",
    label: "README includes screenshots or demo",
    missingSignal: "No screenshots or demo found",
    patterns: [
      /^#{1,3}\s+(screenshots?|demo|preview|gallery|video)/im,
      /!\[[^\]]*]\([^)]+\)/,
      /\b(demo|screenshot|preview|gif|video)\b/i,
    ],
  },
  {
    id: "tech-stack",
    label: "README names the tech stack",
    missingSignal: "Tech stack is not described",
    patterns: [/^#{1,3}\s+(tech stack|technologies|built with|stack)/im],
  },
  {
    id: "testing",
    label: "README mentions testing",
    missingSignal: "Testing is not documented",
    patterns: [/^#{1,3}\s+(test|tests|testing)/im, /\b(pnpm test|npm test|pytest|cargo test)\b/i],
  },
  {
    id: "roadmap",
    label: "README includes roadmap or future work",
    missingSignal: "Roadmap or future work is not documented",
    patterns: [/^#{1,3}\s+(roadmap|future|planned|todo|next steps)/im],
  },
];

export function analyzeRepositories(
  repositories: Repository[],
  readmes: Record<string, RepositoryReadmeState> = {},
  now: Date = new Date(),
): AnalysisResult[] {
  return repositories.map((repository) =>
    analyzeRepository(repository, readmes[repository.id], now),
  );
}

export function analyzeRepository(
  repository: Repository,
  readmeState: RepositoryReadmeState | undefined,
  now: Date = new Date(),
): AnalysisResult {
  const checks = [
    metadataCheck(
      "description",
      "Repository has a description",
      Boolean(repository.description?.trim()),
      "No repository description provided",
    ),
    metadataCheck(
      "topics",
      "Repository has topics",
      repository.topics.length > 0,
      "No repository topics configured",
    ),
    metadataCheck(
      "homepage",
      "Repository links to a homepage or demo",
      Boolean(repository.homepageUrl?.trim()),
      "No homepage or demo link configured",
    ),
    metadataCheck(
      "license",
      "Repository declares a license",
      Boolean(repository.license),
      "No license metadata found",
    ),
    recentActivityCheck(repository, now),
    {
      id: "not-archived",
      label: "Repository is not archived",
      category: "status",
      status: repository.archived ? "failed" : "passed",
      evidence: repository.archived
        ? "Archived repositories are not active candidates."
        : undefined,
    } satisfies CheckResult,
    {
      id: "original-repository",
      label: "Repository is original work",
      category: "status",
      status: repository.fork ? "not-applicable" : "passed",
      evidence: repository.fork
        ? "Forked repositories are shown but labeled separately."
        : undefined,
    } satisfies CheckResult,
    ...readmeChecks(readmeState),
  ];

  const passedCount = checks.filter((check) => check.status === "passed").length;
  const failedChecks = checks.filter((check) => check.status === "failed");
  const unknownCount = checks.filter((check) => check.status === "unknown").length;
  const missingSignals = failedChecks
    .map((check) => check.evidence)
    .filter((signal): signal is string => Boolean(signal))
    .slice(0, 3);

  return {
    repository,
    checks,
    analyzedAt: now.toISOString(),
    healthLabel: chooseHealthLabel(repository, checks),
    passedCount,
    failedCount: failedChecks.length,
    unknownCount,
    missingSignals,
  };
}

function metadataCheck(
  id: string,
  label: string,
  passed: boolean,
  missingSignal: string,
): CheckResult {
  return {
    id,
    label,
    category: "metadata",
    status: passed ? "passed" : "failed",
    evidence: passed ? undefined : missingSignal,
  };
}

function recentActivityCheck(repository: Repository, now: Date): CheckResult {
  const activityDate = parseDate(repository.pushedAt ?? repository.updatedAt);
  if (!activityDate) {
    return {
      id: "recent-activity",
      label: "Repository was active in the last 12 months",
      category: "activity",
      status: "unknown",
      evidence: "GitHub did not provide a usable activity date.",
    };
  }

  const daysSinceActivity = Math.floor((now.getTime() - activityDate.getTime()) / 86_400_000);
  return {
    id: "recent-activity",
    label: "Repository was active in the last 12 months",
    category: "activity",
    status: daysSinceActivity <= RECENT_ACTIVITY_DAYS ? "passed" : "failed",
    evidence:
      daysSinceActivity <= RECENT_ACTIVITY_DAYS
        ? undefined
        : `Last activity was ${daysSinceActivity} days ago`,
  };
}

function readmeChecks(readmeState: RepositoryReadmeState | undefined): CheckResult[] {
  if (!readmeState) {
    return [
      unknownCheck("readme", "README status is known", "README was not checked in this phase."),
      ...readmeSections.map((section) =>
        unknownCheck(
          `readme-${section.id}`,
          section.label,
          "README sections were not checked in this phase.",
        ),
      ),
    ];
  }

  if (readmeState.status === "unknown") {
    return [
      unknownCheck("readme", "README exists", readmeState.message),
      ...readmeSections.map((section) =>
        unknownCheck(`readme-${section.id}`, section.label, readmeState.message),
      ),
    ];
  }

  if (readmeState.status === "missing") {
    return [
      {
        id: "readme",
        label: "README exists",
        category: "documentation",
        status: "failed",
        evidence: "No README found",
      },
      ...readmeSections.map((section) => ({
        id: `readme-${section.id}`,
        label: section.label,
        category: "documentation" as CheckCategory,
        status: "not-applicable" as CheckStatus,
        evidence: "README is missing.",
      })),
    ];
  }

  const content = readmeState.readme.content;
  return [
    {
      id: "readme",
      label: "README exists",
      category: "documentation",
      status: "passed",
      evidence: readmeState.readme.path,
    },
    ...readmeSections.map((section): CheckResult => {
      const passed = section.id === "purpose" ? hasPurpose(content) : hasSection(content, section);
      return {
        id: `readme-${section.id}`,
        label: section.label,
        category: "documentation",
        status: passed ? "passed" : "failed",
        evidence: passed ? undefined : section.missingSignal,
      };
    }),
  ];
}

function unknownCheck(id: string, label: string, evidence: string): CheckResult {
  return {
    id,
    label,
    category: "documentation",
    status: "unknown",
    evidence,
  };
}

function hasSection(content: string, section: ReadmeSectionDefinition): boolean {
  return section.patterns.some((pattern) => pattern.test(content));
}

function hasPurpose(content: string): boolean {
  if (hasSection(content, readmeSections[0])) return true;
  const bodyWithoutTitle = content.replace(/^#\s+.+$/m, "").trim();
  return bodyWithoutTitle.length >= 120;
}

function chooseHealthLabel(repository: Repository, checks: CheckResult[]): HealthLabel {
  if (repository.archived) return "Archived";
  if (repository.fork) return "Fork";
  if (checkStatus(checks, "readme") === "failed") return "Needs README";
  if (checkStatus(checks, "recent-activity") === "failed") return "Stale";
  if (
    ["description", "topics", "homepage", "license"].some(
      (id) => checkStatus(checks, id) === "failed",
    )
  ) {
    return "Needs metadata";
  }
  if (checkStatus(checks, "readme-screenshots-demo") === "failed") return "Needs presentation";
  return "Strong start";
}

function checkStatus(checks: CheckResult[], id: string): CheckStatus | undefined {
  return checks.find((check) => check.id === id)?.status;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
