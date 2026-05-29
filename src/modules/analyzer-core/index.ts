import type {
  AnalysisResult,
  CheckCategory,
  CheckResult,
  CheckStatus,
  HealthLabel,
  ProjectType,
  Repository,
  RepositoryReadmeState,
  RepositoryTreeState,
} from "@/types";
import { scoreChecks } from "@/modules/scoring-engine";
import type { ScoreCategory } from "@/modules/scoring-engine";
import { generateRecommendations } from "@/modules/recommendation-engine";
import { classifyRepository, profileFor } from "@/modules/project-classifier";
import { detectTechSignals, findTechSignal } from "./tech-stack";
import type { TechSignal } from "./tech-stack";

export type { TechSignal, TechSignalId } from "./tech-stack";
export { detectTechSignals } from "./tech-stack";

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
  trees: Record<string, RepositoryTreeState> = {},
  now: Date = new Date(),
  overrides: Record<string, ProjectType> = {},
  userWeights: Partial<Record<ScoreCategory, number>> = {},
): AnalysisResult[] {
  return repositories.map((repository) =>
    analyzeRepository(
      repository,
      readmes[repository.id],
      trees[repository.id],
      now,
      overrides[repository.id],
      userWeights,
    ),
  );
}

export function analyzeRepository(
  repository: Repository,
  readmeState: RepositoryReadmeState | undefined,
  treeState: RepositoryTreeState | undefined = undefined,
  now: Date = new Date(),
  override?: ProjectType,
  userWeights: Partial<Record<ScoreCategory, number>> = {},
): AnalysisResult {
  const techSignals = collectTechSignals(treeState);
  const classification = classifyRepository(repository, treeState, techSignals, override);
  const profile = profileFor(classification.type);
  const weights = mergeWeights(profile.categoryWeights, userWeights);
  const profileChecks = profile.extraChecks({ repository, readmeState, treeState });
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
    ...buildabilityChecks(treeState, techSignals),
    ...ciChecks(treeState, techSignals),
    ...testsChecks(treeState, techSignals),
    ...infrastructureChecks(treeState, techSignals),
    ...docsFolderChecks(treeState, techSignals),
    ...securityChecks(treeState),
    ...profileChecks,
  ];

  const passedCount = checks.filter((check) => check.status === "passed").length;
  const failedChecks = checks.filter((check) => check.status === "failed");
  const unknownCount = checks.filter((check) => check.status === "unknown").length;
  const missingSignals = failedChecks
    .map((check) => check.evidence)
    .filter((signal): signal is string => Boolean(signal))
    .slice(0, 3);

  const score = scoreChecks(checks, weights);
  const recommendations = generateRecommendations(checks);

  return {
    repository,
    checks,
    analyzedAt: now.toISOString(),
    healthLabel: chooseHealthLabel(repository, checks, score.total),
    score,
    passedCount,
    failedCount: failedChecks.length,
    unknownCount,
    missingSignals,
    recommendations,
    classification,
    classificationOverride: override,
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
      unknownCheck(
        "readme",
        "README status is known",
        "README content is unavailable for this repository.",
      ),
      ...readmeSections.map((section) =>
        unknownCheck(
          `readme-${section.id}`,
          section.label,
          "README content is unavailable for this repository.",
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

function chooseHealthLabel(
  repository: Repository,
  checks: CheckResult[],
  total: number | null,
): HealthLabel {
  if (repository.archived) return "Archived";
  if (repository.fork) return "Fork";
  if (checkStatus(checks, "recent-activity") === "failed") return "Stale";
  if (total === null) return "Analyzing";
  if (total >= 85) return "Portfolio-ready";
  if (total >= 70) return "Almost ready";
  if (total >= 50) return "Needs work";
  return "Experimental";
}

function checkStatus(checks: CheckResult[], id: string): CheckStatus | undefined {
  return checks.find((check) => check.id === id)?.status;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Combine project-type profile weights with user-configured multipliers so that
 * classification still shapes scoring while user preferences nudge it:
 * `finalWeight = (profileWeight ?? 1) * (userWeight ?? 1)`.
 */
export function mergeWeights(
  profileWeights: Partial<Record<ScoreCategory, number>>,
  userWeights: Partial<Record<ScoreCategory, number>>,
): Partial<Record<ScoreCategory, number>> {
  const categories = new Set<ScoreCategory>([
    ...(Object.keys(profileWeights) as ScoreCategory[]),
    ...(Object.keys(userWeights) as ScoreCategory[]),
  ]);
  const merged: Partial<Record<ScoreCategory, number>> = {};
  for (const category of categories) {
    merged[category] = (profileWeights[category] ?? 1) * (userWeights[category] ?? 1);
  }
  return merged;
}

export function collectTechSignals(treeState: RepositoryTreeState | undefined): TechSignal[] {
  if (!treeState) return [];
  if (treeState.status === "found" || treeState.status === "truncated") {
    return detectTechSignals(treeState.tree);
  }
  return [];
}

function buildabilityChecks(
  treeState: RepositoryTreeState | undefined,
  techSignals: TechSignal[],
): CheckResult[] {
  const treeUnknown = isTreeUnknown(treeState);
  const treeEmpty = treeState?.status === "empty";

  const manifestSignal = ["node", "python", "rust", "go", "java-gradle"]
    .map((id) => findTechSignal(techSignals, id as TechSignal["id"]))
    .find((signal): signal is TechSignal => Boolean(signal));

  const lockfileEvidence = findLockfileEvidence(treeState);

  const dockerSignal = findTechSignal(techSignals, "docker");

  return [
    deriveCheck({
      id: "build-manifest",
      label: "Repository declares a build manifest",
      category: "buildability",
      treeUnknown,
      treeEmpty,
      passed: Boolean(manifestSignal),
      passedEvidence: manifestSignal?.evidence.join(", "),
      failedEvidence:
        "No package manifest detected (package.json, pyproject.toml, Cargo.toml, go.mod, build.gradle*).",
    }),
    deriveCheck({
      id: "lockfile",
      label: "Dependency lockfile is committed",
      category: "buildability",
      treeUnknown,
      treeEmpty,
      passed: lockfileEvidence !== null,
      passedEvidence: lockfileEvidence ?? undefined,
      failedEvidence: "No lockfile committed — installs may not be reproducible.",
    }),
    deriveCheck({
      id: "dockerfile",
      label: "Repository ships a Dockerfile or Compose file",
      category: "containerization",
      treeUnknown,
      treeEmpty,
      passed: Boolean(dockerSignal),
      passedEvidence: dockerSignal?.evidence.join(", "),
      failedEvidence: "No Dockerfile or docker-compose file found.",
    }),
  ];
}

function ciChecks(
  treeState: RepositoryTreeState | undefined,
  techSignals: TechSignal[],
): CheckResult[] {
  const treeUnknown = isTreeUnknown(treeState);
  const treeEmpty = treeState?.status === "empty";
  const ciSignal = findTechSignal(techSignals, "github-actions");

  return [
    deriveCheck({
      id: "github-actions",
      label: "GitHub Actions workflows are configured",
      category: "ci",
      treeUnknown,
      treeEmpty,
      passed: Boolean(ciSignal),
      passedEvidence: ciSignal?.evidence.join(", "),
      failedEvidence: "No GitHub Actions workflows found under .github/workflows.",
    }),
  ];
}

function testsChecks(
  treeState: RepositoryTreeState | undefined,
  techSignals: TechSignal[],
): CheckResult[] {
  const treeUnknown = isTreeUnknown(treeState);
  const treeEmpty = treeState?.status === "empty";
  const testSignal = findTechSignal(techSignals, "tests");

  return [
    deriveCheck({
      id: "tests-present",
      label: "Repository contains test files or directories",
      category: "tests",
      treeUnknown,
      treeEmpty,
      passed: Boolean(testSignal),
      passedEvidence: testSignal?.evidence.join(", "),
      failedEvidence: "No test directories or test files detected.",
    }),
  ];
}

function infrastructureChecks(
  treeState: RepositoryTreeState | undefined,
  techSignals: TechSignal[],
): CheckResult[] {
  if (isTreeUnknown(treeState)) {
    return [
      {
        id: "infrastructure-as-code",
        label: "Repository declares infrastructure as code",
        category: "infrastructure",
        status: "unknown",
        evidence: "Repository file tree was not available.",
      },
    ];
  }

  const terraform = findTechSignal(techSignals, "terraform");
  const kubernetes = findTechSignal(techSignals, "kubernetes");
  const evidence = [terraform, kubernetes]
    .filter((signal): signal is TechSignal => Boolean(signal))
    .flatMap((signal) => signal.evidence)
    .slice(0, 3);

  if (terraform || kubernetes) {
    return [
      {
        id: "infrastructure-as-code",
        label: "Repository declares infrastructure as code",
        category: "infrastructure",
        status: "passed",
        evidence: evidence.join(", "),
      },
    ];
  }

  return [
    {
      id: "infrastructure-as-code",
      label: "Repository declares infrastructure as code",
      category: "infrastructure",
      status: "not-applicable",
      evidence: "No Terraform, Helm or Kubernetes manifests detected.",
    },
  ];
}

function securityChecks(treeState: RepositoryTreeState | undefined): CheckResult[] {
  const treeUnknown = isTreeUnknown(treeState);
  const treeEmpty = treeState?.status === "empty";

  const securityMd = findEntry(treeState, (path) => /(^|\/)SECURITY\.md$/i.test(path));
  const envExample = findEntry(treeState, (path) => {
    const slash = path.lastIndexOf("/");
    const name = slash === -1 ? path : path.slice(slash + 1);
    return (
      name === ".env.example" ||
      name === ".env.sample" ||
      name === ".env.template" ||
      name === ".env.dist"
    );
  });

  return [
    deriveCheck({
      id: "security-md",
      label: "Repository ships a SECURITY.md",
      category: "security",
      treeUnknown,
      treeEmpty,
      passed: securityMd !== null,
      passedEvidence: securityMd ?? undefined,
      failedEvidence: "No SECURITY.md found — a short security policy helps reporters reach you.",
    }),
    deriveCheck({
      id: "env-example",
      label: "Repository ships an example env file",
      category: "security",
      treeUnknown,
      treeEmpty,
      passed: envExample !== null,
      passedEvidence: envExample ?? undefined,
      failedEvidence:
        "No .env.example or equivalent template found — committed example env files document configuration safely.",
    }),
  ];
}

function findEntry(
  treeState: RepositoryTreeState | undefined,
  predicate: (path: string) => boolean,
): string | null {
  if (!treeState || (treeState.status !== "found" && treeState.status !== "truncated")) {
    return null;
  }
  for (const entry of treeState.tree.entries) {
    if (entry.type === "blob" && predicate(entry.path)) {
      return entry.path;
    }
  }
  return null;
}

function docsFolderChecks(
  treeState: RepositoryTreeState | undefined,
  techSignals: TechSignal[],
): CheckResult[] {
  const treeUnknown = isTreeUnknown(treeState);
  const treeEmpty = treeState?.status === "empty";
  const docsSignal = findTechSignal(techSignals, "docs-folder");

  return [
    deriveCheck({
      id: "docs-folder",
      label: "Repository ships a dedicated docs/ folder",
      category: "documentation",
      treeUnknown,
      treeEmpty,
      passed: Boolean(docsSignal),
      passedEvidence: docsSignal?.evidence.join(", "),
      failedEvidence: "No docs/ or documentation/ folder found.",
    }),
  ];
}

interface DeriveCheckInput {
  id: string;
  label: string;
  category: CheckCategory;
  treeUnknown: boolean;
  treeEmpty: boolean;
  passed: boolean;
  passedEvidence?: string;
  failedEvidence: string;
}

function deriveCheck(input: DeriveCheckInput): CheckResult {
  if (input.passed) {
    return {
      id: input.id,
      label: input.label,
      category: input.category,
      status: "passed",
      evidence: input.passedEvidence,
    };
  }
  if (input.treeUnknown) {
    return {
      id: input.id,
      label: input.label,
      category: input.category,
      status: "unknown",
      evidence: "Repository file tree was not available.",
    };
  }
  if (input.treeEmpty) {
    return {
      id: input.id,
      label: input.label,
      category: input.category,
      status: "not-applicable",
      evidence: "Repository is empty.",
    };
  }
  return {
    id: input.id,
    label: input.label,
    category: input.category,
    status: "failed",
    evidence: input.failedEvidence,
  };
}

function isTreeUnknown(treeState: RepositoryTreeState | undefined): boolean {
  return !treeState || treeState.status === "unknown" || treeState.status === "truncated";
}

const LOCKFILE_NAMES = new Set([
  "pnpm-lock.yaml",
  "yarn.lock",
  "package-lock.json",
  "bun.lockb",
  "Cargo.lock",
  "go.sum",
  "poetry.lock",
  "Pipfile.lock",
]);

function findLockfileEvidence(treeState: RepositoryTreeState | undefined): string | null {
  if (!treeState || (treeState.status !== "found" && treeState.status !== "truncated")) {
    return null;
  }
  for (const entry of treeState.tree.entries) {
    if (entry.type !== "blob") continue;
    const slash = entry.path.lastIndexOf("/");
    const name = slash === -1 ? entry.path : entry.path.slice(slash + 1);
    if (LOCKFILE_NAMES.has(name)) {
      return entry.path;
    }
  }
  return null;
}
