import type {
  CheckCategory,
  CheckResult,
  Repository,
  RepositoryReadmeState,
  RepositoryTreeState,
} from "@/types";
import type { ScoreCategory } from "@/modules/scoring-engine";
import type { ProjectType } from "./types";

export interface ProfileContext {
  repository: Repository;
  readmeState: RepositoryReadmeState | undefined;
  treeState: RepositoryTreeState | undefined;
}

export interface ClassificationProfile {
  categoryWeights: Partial<Record<ScoreCategory, number>>;
  extraChecks: (ctx: ProfileContext) => CheckResult[];
}

const NEUTRAL: ClassificationProfile = {
  categoryWeights: {},
  extraChecks: () => [],
};

export function profileFor(type: ProjectType): ClassificationProfile {
  switch (type) {
    case "frontend":
      return FRONTEND;
    case "backend":
      return BACKEND;
    case "full-stack":
      return FULLSTACK;
    case "desktop":
      return DESKTOP;
    case "cli":
      return CLI;
    case "library":
      return LIBRARY;
    case "unknown":
    default:
      return NEUTRAL;
  }
}

const FRONTEND: ClassificationProfile = {
  categoryWeights: {
    presentation: 2,
    "deployment-operations": 0.5,
  },
  extraChecks: () => [],
};

const BACKEND: ClassificationProfile = {
  categoryWeights: {
    "testing-ci": 1.5,
    "deployment-operations": 1.5,
    security: 1.25,
    presentation: 0.5,
  },
  extraChecks: (ctx) => [
    readmeSectionCheck(ctx, {
      id: "api-section-in-readme",
      label: "README documents the API surface",
      category: "documentation",
      patterns: [/^#{1,4}\s+(api|endpoints?|routes?|reference)\b/im],
      failedEvidence: "No API, endpoints or routes section found in the README.",
    }),
  ],
};

const FULLSTACK: ClassificationProfile = {
  categoryWeights: {
    presentation: 1.5,
    "testing-ci": 1.25,
    "deployment-operations": 1.25,
  },
  extraChecks: (ctx) => [
    readmeSectionCheck(ctx, {
      id: "api-section-in-readme",
      label: "README documents the API surface",
      category: "documentation",
      patterns: [/^#{1,4}\s+(api|endpoints?|routes?|reference)\b/im],
      failedEvidence: "No API, endpoints or routes section found in the README.",
    }),
  ],
};

const DESKTOP: ClassificationProfile = {
  categoryWeights: {
    presentation: 1.5,
    "deployment-operations": 1.25,
  },
  extraChecks: (ctx) => [
    readmeSectionCheck(ctx, {
      id: "release-artifact-link-in-readme",
      label: "README links to release artifacts",
      category: "documentation",
      patterns: [
        /\bhttps?:\/\/[^\s)]*\/releases?\b/i,
        /^#{1,4}\s+(download|install|releases?)\b/im,
        /\b(installer|\.dmg|\.exe|\.appimage|\.msi)\b/i,
      ],
      failedEvidence: "No installer, download link or Releases reference found in the README.",
    }),
  ],
};

const CLI: ClassificationProfile = {
  categoryWeights: {
    documentation: 1.25,
    "testing-ci": 1.25,
    presentation: 0.25,
  },
  extraChecks: (ctx) => [
    readmeSectionCheck(ctx, {
      id: "cli-usage-example-in-readme",
      label: "README shows command-line usage",
      category: "documentation",
      patterns: [/```(sh|bash|console|shell)?\s*\n[^`]*\$\s+\w+/i, /^\$\s+\w+/m, /\bnpx\s+\w+/i],
      failedEvidence: "No shell example or command-line invocation found in the README.",
    }),
  ],
};

const LIBRARY: ClassificationProfile = {
  categoryWeights: {
    documentation: 1.5,
    "testing-ci": 1.5,
    presentation: 0.25,
    "deployment-operations": 0.25,
  },
  extraChecks: (ctx) => [
    readmeSectionCheck(ctx, {
      id: "api-or-usage-section-in-readme",
      label: "README documents the public API or usage",
      category: "documentation",
      patterns: [/^#{1,4}\s+(api|usage|reference|examples?)\b/im],
      failedEvidence: "No API, usage or reference section found in the README.",
    }),
  ],
};

interface ReadmeSectionCheckInput {
  id: string;
  label: string;
  category: CheckCategory;
  patterns: RegExp[];
  failedEvidence: string;
}

function readmeSectionCheck(ctx: ProfileContext, input: ReadmeSectionCheckInput): CheckResult {
  const readme = ctx.readmeState;
  if (!readme) {
    return {
      id: input.id,
      label: input.label,
      category: input.category,
      status: "unknown",
      evidence: "README content is unavailable for this repository.",
    };
  }
  if (readme.status === "unknown") {
    return {
      id: input.id,
      label: input.label,
      category: input.category,
      status: "unknown",
      evidence: readme.message,
    };
  }
  if (readme.status === "missing") {
    return {
      id: input.id,
      label: input.label,
      category: input.category,
      status: "not-applicable",
      evidence: "README is missing.",
    };
  }
  const passed = input.patterns.some((pattern) => pattern.test(readme.readme.content));
  return {
    id: input.id,
    label: input.label,
    category: input.category,
    status: passed ? "passed" : "failed",
    evidence: passed ? undefined : input.failedEvidence,
  };
}
