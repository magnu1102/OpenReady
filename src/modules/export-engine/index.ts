import type { AnalysisResult, CheckResult, Recommendation } from "@/types";
import type { TechSignal } from "@/modules/analyzer-core";
import {
  buildCvBullets,
  buildTalkingPoints,
  rolePreset,
  selectFeatured,
  type RoleId,
} from "@/modules/portfolio";

export interface ExportInput {
  username: string;
  analyses: AnalysisResult[];
  generatedAt?: string;
}

export type ExportFormat =
  | "markdown"
  | "json"
  | "homepage-cards"
  | "portfolio"
  | "cv"
  | "talking-points";

interface JsonSummary {
  schema: "openready.export.v1";
  generatedAt: string;
  username: string;
  repositoryCount: number;
  repositories: JsonRepositorySummary[];
}

interface JsonRepositorySummary {
  id: string;
  name: string;
  fullName: string;
  url: string;
  homepageUrl: string | null;
  description: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  forks: number;
  archived: boolean;
  fork: boolean;
  updatedAt: string;
  pushedAt: string | null;
  healthLabel: AnalysisResult["healthLabel"];
  score: AnalysisResult["score"];
  passedCount: number;
  failedCount: number;
  unknownCount: number;
  missingSignals: string[];
  failedChecks: CheckResult[];
  unknownChecks: CheckResult[];
  recommendations: Recommendation[];
}

const DEFAULT_GENERATED_AT = "unknown";

export function exportMarkdownReport(input: ExportInput): string {
  const generatedAt = input.generatedAt ?? DEFAULT_GENERATED_AT;
  const lines = [
    `# OpenReady report for ${input.username || "unknown user"}`,
    "",
    `Generated: ${generatedAt}`,
    "",
    `Repositories analyzed: ${input.analyses.length}`,
    "",
  ];

  if (input.analyses.length === 0) {
    return [...lines, "No repositories were available for export.", ""].join("\n");
  }

  const totals = input.analyses
    .map((analysis) => analysis.score.total)
    .filter((score): score is number => score !== null);
  const averageScore =
    totals.length === 0
      ? "N/A"
      : Math.round(totals.reduce((sum, score) => sum + score, 0) / totals.length).toString();
  const portfolioReady = input.analyses.filter(
    (analysis) => analysis.healthLabel === "Portfolio-ready",
  ).length;

  lines.push("## Profile summary", "");
  lines.push(`- Average score: ${averageScore}`);
  lines.push(`- Portfolio-ready repositories: ${portfolioReady}`);
  lines.push(`- Repositories needing work: ${countNeedsWork(input.analyses)}`);
  lines.push("");
  lines.push("## Repositories", "");

  for (const analysis of sortAnalyses(input.analyses)) {
    lines.push(`### ${analysis.repository.fullName}`);
    lines.push("");
    lines.push(`- Score: ${formatScore(analysis.score.total)}`);
    lines.push(`- Label: ${analysis.healthLabel}`);
    lines.push(`- URL: ${analysis.repository.url}`);
    if (analysis.repository.homepageUrl) {
      lines.push(`- Homepage: ${analysis.repository.homepageUrl}`);
    }
    lines.push(`- Strongest category: ${formatCategory(analysis, "strongest")}`);
    lines.push(`- Weakest category: ${formatCategory(analysis, "weakest")}`);
    lines.push(`- Missing signals: ${formatList(analysis.missingSignals)}`);
    lines.push("");
    lines.push("Top recommendations:");
    for (const recommendation of analysis.recommendations.slice(0, 3)) {
      lines.push(`- ${recommendation.title} (${recommendation.priority})`);
    }
    if (analysis.recommendations.length === 0) {
      lines.push("- No major missing signals detected.");
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function exportJsonSummary(input: ExportInput): string {
  const summary: JsonSummary = {
    schema: "openready.export.v1",
    generatedAt: input.generatedAt ?? DEFAULT_GENERATED_AT,
    username: input.username,
    repositoryCount: input.analyses.length,
    repositories: sortAnalyses(input.analyses).map((analysis) => ({
      id: analysis.repository.id,
      name: analysis.repository.name,
      fullName: analysis.repository.fullName,
      url: analysis.repository.url,
      homepageUrl: analysis.repository.homepageUrl,
      description: analysis.repository.description,
      language: analysis.repository.language,
      topics: analysis.repository.topics,
      stars: analysis.repository.stars,
      forks: analysis.repository.forks,
      archived: analysis.repository.archived,
      fork: analysis.repository.fork,
      updatedAt: analysis.repository.updatedAt,
      pushedAt: analysis.repository.pushedAt,
      healthLabel: analysis.healthLabel,
      score: analysis.score,
      passedCount: analysis.passedCount,
      failedCount: analysis.failedCount,
      unknownCount: analysis.unknownCount,
      missingSignals: analysis.missingSignals,
      failedChecks: analysis.checks.filter((check) => check.status === "failed"),
      unknownChecks: analysis.checks.filter((check) => check.status === "unknown"),
      recommendations: analysis.recommendations,
    })),
  };

  return `${JSON.stringify(summary, null, 2)}\n`;
}

export function exportHomepageCards(input: ExportInput): string {
  const candidates = homepageCandidates(input.analyses);
  const lines = [
    `# Featured projects from ${input.username || "GitHub"}`,
    "",
    `Generated by OpenReady on ${input.generatedAt ?? DEFAULT_GENERATED_AT}.`,
    "",
  ];

  if (candidates.length === 0) {
    return [...lines, "No repositories were available for homepage cards.", ""].join("\n");
  }

  for (const analysis of candidates.slice(0, 6)) {
    const repository = analysis.repository;
    lines.push(`## [${escapeMarkdown(repository.name)}](${repository.url})`);
    lines.push("");
    lines.push(repository.description?.trim() || "No repository description provided.");
    lines.push("");
    lines.push(
      `**Score:** ${formatScore(analysis.score.total)} | **Status:** ${analysis.healthLabel}`,
    );
    const details = [
      repository.language,
      repository.topics.slice(0, 3).join(", "),
      `${repository.stars} stars`,
    ].filter(Boolean);
    lines.push(`**Highlights:** ${details.join(" | ") || "Public GitHub repository"}`);
    if (analysis.recommendations[0]) {
      lines.push(`**Next improvement:** ${analysis.recommendations[0].title}`);
    }
    if (repository.homepageUrl) {
      lines.push(`[Live demo](${repository.homepageUrl})`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export interface PortfolioExportInput {
  username: string;
  analyses: AnalysisResult[];
  signalsById: Record<string, TechSignal[]>;
  role: RoleId;
  overrides?: Record<string, boolean>;
  generatedAt?: string;
}

export function exportPortfolioMarkdown(input: PortfolioExportInput): string {
  const preset = rolePreset(input.role);
  const featured = selectFeatured(
    input.analyses,
    input.signalsById,
    input.role,
    input.overrides ?? {},
  );
  const lines = [
    `# ${input.username || "GitHub"} — ${preset.label} portfolio`,
    "",
    `Generated by OpenReady on ${input.generatedAt ?? DEFAULT_GENERATED_AT}.`,
    "",
    preset.blurb,
    "",
  ];

  if (featured.length === 0) {
    return [...lines, "No repositories were available to feature.", ""].join("\n");
  }

  lines.push("## Featured projects", "");
  for (const { analysis, reasons } of featured) {
    const repo = analysis.repository;
    lines.push(`### [${escapeMarkdown(repo.name)}](${repo.url})`);
    lines.push("");
    lines.push(repo.description?.trim() || "No repository description provided.");
    lines.push("");
    lines.push(
      `**Score:** ${formatScore(analysis.score.total)} | **Status:** ${analysis.healthLabel}`,
    );
    if (reasons.length > 0) {
      lines.push(`**Why it fits:** ${reasons.join("; ")}`);
    }
    if (repo.homepageUrl) {
      lines.push(`[Live demo](${repo.homepageUrl})`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function exportCvBullets(input: PortfolioExportInput): string {
  const preset = rolePreset(input.role);
  const featured = selectFeatured(
    input.analyses,
    input.signalsById,
    input.role,
    input.overrides ?? {},
  );
  const lines = [
    `# CV bullet points — ${preset.label}`,
    "",
    `Generated by OpenReady on ${input.generatedAt ?? DEFAULT_GENERATED_AT}. Edit freely before use.`,
    "",
  ];

  if (featured.length === 0) {
    return [...lines, "No repositories were available for CV bullets.", ""].join("\n");
  }

  for (const entry of buildCvBullets(featured, input.role)) {
    lines.push(`## ${entry.name}`, "");
    for (const bullet of entry.bullets) {
      lines.push(`- ${bullet}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function exportTalkingPointsMarkdown(input: PortfolioExportInput): string {
  const preset = rolePreset(input.role);
  const featured = selectFeatured(
    input.analyses,
    input.signalsById,
    input.role,
    input.overrides ?? {},
  );
  const lines = [
    `# Interview talking points — ${preset.label}`,
    "",
    `Generated by OpenReady on ${input.generatedAt ?? DEFAULT_GENERATED_AT}.`,
    "",
  ];

  if (featured.length === 0) {
    return [...lines, "No repositories were available for talking points.", ""].join("\n");
  }

  for (const { analysis } of featured) {
    const points = buildTalkingPoints(analysis, input.signalsById[analysis.repository.id] ?? []);
    lines.push(`## ${points.name}`, "");
    lines.push("**Highlights**");
    for (const highlight of points.highlights) lines.push(`- ${highlight}`);
    lines.push("", "**Likely questions**");
    for (const question of points.likelyQuestions) lines.push(`- ${question}`);
    lines.push("", "**Gaps to own**");
    if (points.gapsToOwn.length > 0) {
      for (const gap of points.gapsToOwn) lines.push(`- ${gap}`);
    } else {
      lines.push("- No major gaps detected.");
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function suggestedExportFilename(format: ExportFormat, username: string): string {
  const safeUsername = slugify(username || "github-user");
  switch (format) {
    case "markdown":
      return `${safeUsername}-openready-report.md`;
    case "json":
      return `${safeUsername}-openready-summary.json`;
    case "homepage-cards":
      return `${safeUsername}-homepage-cards.md`;
    case "portfolio":
      return `${safeUsername}-portfolio.md`;
    case "cv":
      return `${safeUsername}-cv-bullets.md`;
    case "talking-points":
      return `${safeUsername}-talking-points.md`;
  }
}

function sortAnalyses(analyses: AnalysisResult[]): AnalysisResult[] {
  return [...analyses].sort((a, b) => {
    const scoreDelta = (b.score.total ?? -1) - (a.score.total ?? -1);
    if (scoreDelta !== 0) return scoreDelta;
    const starDelta = b.repository.stars - a.repository.stars;
    if (starDelta !== 0) return starDelta;
    return a.repository.fullName.localeCompare(b.repository.fullName);
  });
}

function homepageCandidates(analyses: AnalysisResult[]): AnalysisResult[] {
  const originals = analyses.filter(
    (analysis) => !analysis.repository.archived && !analysis.repository.fork,
  );
  return sortAnalyses(originals.length > 0 ? originals : analyses);
}

function countNeedsWork(analyses: AnalysisResult[]): number {
  return analyses.filter(
    (analysis) => analysis.healthLabel === "Needs work" || analysis.healthLabel === "Experimental",
  ).length;
}

function formatScore(score: number | null): string {
  return score === null ? "N/A" : `${score}/100`;
}

function formatCategory(analysis: AnalysisResult, type: "strongest" | "weakest"): string {
  const categoryId =
    type === "strongest" ? analysis.score.strongestCategory : analysis.score.weakestCategory;
  const category = analysis.score.categories.find((candidate) => candidate.category === categoryId);
  if (!category) return "N/A";
  return `${category.label} (${formatScore(category.score)})`;
}

function formatList(values: string[]): string {
  return values.length === 0 ? "None" : values.join("; ");
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+.!|-])/g, "\\$1");
}
