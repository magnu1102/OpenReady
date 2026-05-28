import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Archive,
  Download,
  ExternalLink,
  FileJson,
  FileText,
  GitFork,
  Github,
  Inbox,
  RefreshCw,
  ShieldQuestion,
  Star,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tooltip } from "@/components/ui/Tooltip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useRepositoryStore } from "@/store/repositoryStore";
import { collectTechSignals } from "@/modules/analyzer-core";
import { PROJECT_TYPE_LABELS } from "@/modules/project-classifier";
import {
  exportHomepageCards,
  exportJsonSummary,
  exportMarkdownReport,
  suggestedExportFilename,
  type ExportFormat,
} from "@/modules/export-engine";
import { saveExportFile } from "@/lib/exportFiles";
import type { AnalysisResult, HealthLabel, Repository, RepositoryTreeState } from "@/types";

export function DashboardRoute() {
  const username = useRepositoryStore((s) => s.username);
  const repositories = useRepositoryStore((s) => s.repositories);
  const analyses = useRepositoryStore((s) => s.analyses);
  const trees = useRepositoryStore((s) => s.trees);
  const status = useRepositoryStore((s) => s.status);
  const activeCache = useRepositoryStore((s) => s.activeCache);
  const error = useRepositoryStore((s) => s.error);
  const fetchRepositories = useRepositoryStore((s) => s.fetchRepositories);
  const [exportState, setExportState] = useState<{
    status: "idle" | "saving" | "saved" | "error";
    message: string;
  }>({ status: "idle", message: "" });

  const isLoading = status === "loading";
  const hasRepositories = repositories.length > 0;
  const analysisByRepositoryId = new Map(
    analyses.map((analysis) => [analysis.repository.id, analysis]),
  );
  const portfolioReady = analyses.filter(
    (analysis) => analysis.healthLabel === "Portfolio-ready",
  ).length;
  const needsWork = analyses.filter(
    (analysis) => analysis.healthLabel === "Needs work" || analysis.healthLabel === "Experimental",
  ).length;
  const scoredTotals = analyses
    .map((analysis) => analysis.score.total)
    .filter((total): total is number => total !== null);
  const averageScore =
    scoredTotals.length === 0
      ? null
      : Math.round(scoredTotals.reduce((sum, value) => sum + value, 0) / scoredTotals.length);
  const stats = [
    {
      label: "Repositories",
      value: status === "success" ? repositories.length.toString() : "—",
      icon: GitFork,
      hint: "Public repositories fetched from GitHub.",
    },
    {
      label: "Portfolio-ready",
      value: status === "success" ? portfolioReady.toString() : "—",
      icon: Activity,
      hint: "Repositories scoring at least 85 across the eight categories.",
    },
    {
      label: "Needs work",
      value: status === "success" ? needsWork.toString() : "—",
      icon: ShieldQuestion,
      hint: "Repositories in the Needs work or Experimental tiers.",
    },
    {
      label: "Avg score",
      value: averageScore === null ? "—" : averageScore.toString(),
      icon: Inbox,
      hint: "Mean total score across repositories with at least one resolved category.",
    },
  ];

  async function retry() {
    if (!username) return;
    try {
      await fetchRepositories(username, { forceRefresh: true });
    } catch {
      // The repository store keeps the structured error for this screen.
    }
  }

  async function exportProfile(format: ExportFormat) {
    const generatedAt = new Date().toISOString();
    const content = buildExportContent(format, {
      username,
      analyses,
      generatedAt,
    });

    setExportState({ status: "saving", message: "Preparing export..." });
    try {
      const result = await saveExportFile({
        format,
        content,
        defaultPath: suggestedExportFilename(format, username),
      });
      if (result.status === "cancelled") {
        setExportState({ status: "idle", message: "" });
        return;
      }
      setExportState({ status: "saved", message: "Export saved." });
    } catch {
      setExportState({
        status: "error",
        message: "OpenReady could not save the export. Choose a writable location and try again.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary">
            {username
              ? `Public repositories for ${username}. Deterministic checks and scoring run locally.`
              : "Enter a GitHub username to fetch public repositories."}
          </p>
          {activeCache ? (
            <p className="text-xs text-text-muted">
              {activeCache.isStale ? "Cached snapshot is older than 24 hours." : "Loaded locally."}{" "}
              Last fetched {formatDate(activeCache.fetchedAt)}.
            </p>
          ) : null}
        </div>
        {username ? (
          <Button type="button" variant="secondary" size="sm" disabled={isLoading} onClick={retry}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        ) : null}
      </header>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.04 } },
        }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map(({ label, value, icon: Icon, hint }) => (
          <motion.div
            key={label}
            variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
          >
            <Tooltip content={hint}>
              <Card className="cursor-help">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                    {label}
                  </span>
                  <Icon className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
                </div>
                <div className="mt-3 text-3xl font-semibold tabular-nums text-text-primary">
                  {value}
                </div>
                <div className="mt-1 text-xs text-text-muted">
                  {label === "Repositories" ? "Fetched public metadata" : "From category scores"}
                </div>
              </Card>
            </Tooltip>
          </motion.div>
        ))}
      </motion.div>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Repositories</h2>
          <span className="text-xs text-text-muted">
            {hasRepositories ? `${repositories.length} fetched` : "Public fetch"}
          </span>
        </div>

        {isLoading ? <RepositoryLoadingGrid /> : null}

        {status === "error" && error ? (
          <EmptyState
            icon={AlertTriangle}
            title={errorTitle(error.code)}
            description={error.message}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild variant="secondary" size="md">
                  <Link to="/">Change username</Link>
                </Button>
                {username ? (
                  <Button variant="primary" size="md" onClick={retry}>
                    <RefreshCw className="h-4 w-4" /> Try again
                  </Button>
                ) : null}
              </div>
            }
          />
        ) : null}

        {status === "success" && repositories.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No public repositories found"
            description="GitHub found that user, but there are no public repositories to show."
            action={
              <Button asChild variant="primary" size="md">
                <Link to="/">Analyze another username</Link>
              </Button>
            }
          />
        ) : null}

        {hasRepositories ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {repositories.map((repository, index) => (
              <RepositoryCard
                key={repository.id}
                repository={repository}
                analysis={analysisByRepositoryId.get(repository.id)}
                treeState={trees[repository.id]}
                tourAnchor={index === 0 ? "dashboard-first-card" : undefined}
              />
            ))}
          </div>
        ) : null}
      </section>

      {analyses.length > 0 ? (
        <ExportPanel
          isSaving={exportState.status === "saving"}
          message={exportState.message}
          messageTone={exportState.status === "error" ? "error" : "neutral"}
          onExport={exportProfile}
        />
      ) : null}

      {status === "idle" ? (
        <EmptyState
          icon={Github}
          title="No username analyzed yet"
          description="Start with a public GitHub username. OpenReady will fetch repository metadata without storing it."
          action={
            <Button asChild variant="primary" size="md">
              <Link to="/">Back to Welcome</Link>
            </Button>
          }
        />
      ) : null}
    </div>
  );
}

interface ExportInput {
  username: string;
  analyses: AnalysisResult[];
  generatedAt: string;
}

function buildExportContent(format: ExportFormat, input: ExportInput): string {
  switch (format) {
    case "markdown":
      return exportMarkdownReport(input);
    case "json":
      return exportJsonSummary(input);
    case "homepage-cards":
      return exportHomepageCards(input);
  }
}

function ExportPanel({
  isSaving,
  message,
  messageTone,
  onExport,
}: {
  isSaving: boolean;
  message: string;
  messageTone: "neutral" | "error";
  onExport: (format: ExportFormat) => void;
}) {
  return (
    <section
      className="flex flex-col gap-3 border-t border-border-subtle pt-6"
      data-tour-anchor="export-panel"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-text-primary">Exports</h2>
        <p className="text-sm text-text-secondary">
          Save the current in-memory analysis as a report, machine-readable summary or homepage
          project cards.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isSaving}
          onClick={() => onExport("markdown")}
        >
          <FileText className="h-3.5 w-3.5" /> Markdown
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isSaving}
          onClick={() => onExport("json")}
        >
          <FileJson className="h-3.5 w-3.5" /> JSON
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isSaving}
          onClick={() => onExport("homepage-cards")}
        >
          <Download className="h-3.5 w-3.5" /> Homepage cards
        </Button>
      </div>
      {message ? (
        <p
          className={
            messageTone === "error" ? "text-xs font-medium text-danger" : "text-xs text-text-muted"
          }
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}

function RepositoryLoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading repositories">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-md" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-2.5 w-4/5" />
          <div className="flex gap-2">
            <Skeleton className="h-4 w-10 rounded-full" />
            <Skeleton className="h-4 w-12 rounded-full" />
            <Skeleton className="h-4 w-8 rounded-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function RepositoryCard({
  repository,
  analysis,
  treeState,
  tourAnchor,
}: {
  repository: Repository;
  analysis?: AnalysisResult;
  treeState?: RepositoryTreeState;
  tourAnchor?: string;
}) {
  const techSignals = collectTechSignals(treeState).slice(0, 3);
  return (
    <Card className="flex min-h-[240px] flex-col gap-4" data-tour-anchor={tourAnchor}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/dashboard/repo/${encodeURIComponent(repository.id)}`}
            className="block truncate text-md font-semibold text-text-primary hover:text-accent"
          >
            {repository.name}
          </Link>
          <p className="mt-1 truncate text-xs text-text-muted">{repository.fullName}</p>
        </div>
        <Github className="h-4 w-4 shrink-0 text-text-muted" strokeWidth={1.75} />
      </div>

      <p className="line-clamp-3 min-h-[60px] text-sm text-text-secondary">
        {repository.description || "No repository description provided."}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {analysis ? (
          <Badge tone={healthLabelTone(analysis.healthLabel)}>{analysis.healthLabel}</Badge>
        ) : null}
        {analysis && analysis.classification.type !== "unknown" ? (
          <Badge tone="accent" title={analysis.classification.reasons.join(" · ")}>
            {PROJECT_TYPE_LABELS[analysis.classification.type]}
          </Badge>
        ) : null}
        {repository.language ? <Badge>{repository.language}</Badge> : null}
        {repository.fork ? (
          <Badge tone="warn">
            <GitFork className="h-3 w-3" /> Fork
          </Badge>
        ) : null}
        {repository.archived ? (
          <Badge tone="danger">
            <Archive className="h-3 w-3" /> Archived
          </Badge>
        ) : null}
      </div>

      {techSignals.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {techSignals.map((signal) => (
            <Badge key={signal.id} tone="neutral">
              {signal.label}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-auto flex flex-col gap-3">
        {analysis ? (
          <div className="rounded-md bg-subtle px-3 py-2 text-xs text-text-secondary">
            <div className="font-medium tabular-nums text-text-primary">
              {analysis.score.total === null
                ? "Score pending"
                : `Score ${analysis.score.total} · ${analysis.healthLabel}`}
            </div>
            <div className="mt-1">
              {analysis.missingSignals.length > 0
                ? analysis.missingSignals[0]
                : "No critical gaps detected."}
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5" /> {repository.stars}
          </span>
          <span className="inline-flex items-center gap-1">
            <GitFork className="h-3.5 w-3.5" /> {repository.forks}
          </span>
          <span>Updated {formatDate(repository.updatedAt)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <a href={repository.url} target="_blank" rel="noreferrer">
              <Github className="h-3.5 w-3.5" /> GitHub
            </a>
          </Button>
          {repository.homepageUrl ? (
            <Button asChild variant="ghost" size="sm">
              <a href={repository.homepageUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Homepage
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function healthLabelTone(label: HealthLabel) {
  switch (label) {
    case "Portfolio-ready":
      return "success";
    case "Almost ready":
      return "neutral";
    case "Needs work":
    case "Stale":
      return "warn";
    case "Experimental":
    case "Archived":
      return "danger";
    case "Fork":
    case "Analyzing":
      return "neutral";
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function errorTitle(code: string) {
  switch (code) {
    case "not-found":
      return "GitHub user not found";
    case "rate-limit":
      return "GitHub rate limit reached";
    case "network":
      return "Network connection failed";
    default:
      return "Repository fetch failed";
  }
}
