import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Archive,
  Download,
  ExternalLink,
  FileJson,
  FileText,
  GitCompare,
  GitFork,
  Gem,
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
import { ScoreRing } from "@/components/ui/ScoreRing";
import { ReposIllustration } from "@/components/ui/illustrations";
import { useRepositoryStore } from "@/store/repositoryStore";
import { useComparisonStore, MAX_COMPARISON } from "@/store/comparisonStore";
import { toast } from "@/store/toastStore";
import { collectTechSignals } from "@/modules/analyzer-core";
import { PROJECT_TYPE_LABELS } from "@/modules/project-classifier";
import { copy } from "@/lib/copy";
import {
  exportHomepageCards,
  exportJsonSummary,
  exportMarkdownReport,
  suggestedExportFilename,
  type ExportFormat,
} from "@/modules/export-engine";
import { saveExportFile } from "@/lib/exportFiles";
import { fadeIn, fadeUp, hoverLift, scoreReveal, staggerContainer } from "@/lib/motion";
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
    status: "idle" | "saving";
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
  const hiddenGems = analyses.filter((analysis) => analysis.hiddenGem.isHiddenGem).length;
  const scoredTotals = analyses
    .map((analysis) => analysis.score.total)
    .filter((total): total is number => total !== null);
  const averageScore =
    scoredTotals.length === 0
      ? null
      : Math.round(scoredTotals.reduce((sum, value) => sum + value, 0) / scoredTotals.length);
  const stats = [
    {
      ...copy.dashboard.stats.repositories,
      value: status === "success" ? repositories.length.toString() : "—",
      icon: GitFork,
    },
    {
      ...copy.dashboard.stats.portfolioReady,
      value: status === "success" ? portfolioReady.toString() : "—",
      icon: Activity,
    },
    {
      ...copy.dashboard.stats.needsWork,
      value: status === "success" ? needsWork.toString() : "—",
      icon: ShieldQuestion,
    },
    {
      ...copy.dashboard.stats.hiddenGems,
      value: status === "success" ? hiddenGems.toString() : "—",
      icon: Gem,
    },
    {
      ...copy.dashboard.stats.avgScore,
      value: averageScore === null ? "—" : averageScore.toString(),
      icon: Inbox,
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

    setExportState({ status: "saving", message: copy.dashboard.exportPanel.preparing });
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
      setExportState({ status: "idle", message: "" });
      toast.success(copy.toasts.exportSaved);
    } catch {
      setExportState({ status: "idle", message: "" });
      toast.error(copy.dashboard.exportPanel.exportError);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            {copy.dashboard.title}
          </h1>
          <p className="text-sm text-text-secondary">
            {username ? copy.dashboard.subtitle(username) : copy.dashboard.subtitleNoUser}
          </p>
          {activeCache ? (
            <p className="text-xs text-text-muted">
              {activeCache.isStale ? copy.dashboard.cacheStale : copy.dashboard.cacheFresh}{" "}
              {copy.dashboard.cacheFetched(formatDate(activeCache.fetchedAt))}
            </p>
          ) : null}
        </div>
        {username ? (
          <Button type="button" variant="secondary" size="sm" disabled={isLoading} onClick={retry}>
            <RefreshCw className="h-3.5 w-3.5" /> {copy.dashboard.refresh}
          </Button>
        ) : null}
      </header>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer(0.04)}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        {stats.map(({ label, value, icon: Icon, hint, sub }) => (
          <motion.div key={label} variants={fadeUp}>
            <Tooltip content={hint}>
              <Card className="h-full cursor-help">
                <div className="flex min-h-[2.25rem] items-start justify-between gap-2">
                  <span className="text-xs font-medium uppercase leading-tight tracking-wider text-text-muted">
                    {label}
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-subtle">
                    <Icon className="h-4 w-4 text-accent" strokeWidth={1.75} />
                  </span>
                </div>
                <div className="mt-3 text-3xl font-semibold tabular-nums text-text-primary">
                  {value}
                </div>
                <div className="mt-1 text-xs text-text-muted">{sub}</div>
              </Card>
            </Tooltip>
          </motion.div>
        ))}
      </motion.div>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-text-primary">
            {copy.dashboard.repoSection.heading}
          </h2>
          <span className="text-xs text-text-muted">
            {hasRepositories
              ? copy.dashboard.repoSection.count(repositories.length)
              : copy.dashboard.repoSection.pending}
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
                  <Link to="/">{copy.dashboard.errors.changeUsername}</Link>
                </Button>
                {username ? (
                  <Button variant="primary" size="md" onClick={retry}>
                    <RefreshCw className="h-4 w-4" /> {copy.dashboard.errors.tryAgain}
                  </Button>
                ) : null}
              </div>
            }
          />
        ) : null}

        {status === "success" && repositories.length === 0 ? (
          <EmptyState
            illustration={<ReposIllustration />}
            title={copy.dashboard.empty.noReposTitle}
            description={copy.dashboard.empty.noReposBody}
            action={
              <Button asChild variant="primary" size="md">
                <Link to="/">{copy.dashboard.empty.noReposAction}</Link>
              </Button>
            }
          />
        ) : null}

        {hasRepositories ? (
          <RepositoryGrid>
            {repositories.map((repository, index) => (
              <RepositoryCard
                key={repository.id}
                repository={repository}
                analysis={analysisByRepositoryId.get(repository.id)}
                treeState={trees[repository.id]}
                tourAnchor={index === 0 ? "dashboard-first-card" : undefined}
              />
            ))}
          </RepositoryGrid>
        ) : null}
      </section>

      {analyses.length > 0 ? (
        <ExportPanel
          isSaving={exportState.status === "saving"}
          message={exportState.message}
          onExport={exportProfile}
        />
      ) : null}

      {status === "idle" ? (
        <EmptyState
          illustration={<ReposIllustration />}
          title={copy.dashboard.empty.idleTitle}
          description={copy.dashboard.empty.idleBody}
          action={
            <Button asChild variant="primary" size="md">
              <Link to="/">{copy.dashboard.empty.idleAction}</Link>
            </Button>
          }
        />
      ) : null}

      <CompareBar />
    </div>
  );
}

function CompareBar() {
  const navigate = useNavigate();
  const selectedIds = useComparisonStore((s) => s.selectedIds);
  const clear = useComparisonStore((s) => s.clear);
  if (selectedIds.length === 0) return null;

  return (
    <div className="glass-overlay sticky bottom-4 z-10 mx-auto flex items-center gap-3 rounded-full px-4 py-2">
      <span className="text-sm text-text-secondary">
        {copy.dashboard.compareBar.selected(selectedIds.length)}
      </span>
      <Button
        type="button"
        variant="primary"
        size="sm"
        disabled={selectedIds.length < 2}
        aria-disabled={selectedIds.length < 2}
        onClick={() => navigate("/dashboard/compare")}
      >
        <GitCompare className="h-3.5 w-3.5" /> {copy.dashboard.compareBar.compare}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={clear}>
        {copy.dashboard.compareBar.clear}
      </Button>
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
    default:
      // Portfolio/CV/talking-points exports are produced from the Portfolio route.
      throw new Error(`Unsupported dashboard export format: ${format}`);
  }
}

function ExportPanel({
  isSaving,
  message,
  onExport,
}: {
  isSaving: boolean;
  message: string;
  onExport: (format: ExportFormat) => void;
}) {
  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="glass-card flex flex-col gap-4 rounded-xl p-6"
      data-tour-anchor="export-panel"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-text-primary">
          {copy.dashboard.exportPanel.heading}
        </h2>
        <p className="text-sm text-text-secondary">{copy.dashboard.exportPanel.description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isSaving}
          onClick={() => onExport("markdown")}
        >
          <FileText className="h-3.5 w-3.5" /> {copy.dashboard.exportPanel.markdown}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isSaving}
          onClick={() => onExport("json")}
        >
          <FileJson className="h-3.5 w-3.5" /> {copy.dashboard.exportPanel.json}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isSaving}
          onClick={() => onExport("homepage-cards")}
        >
          <Download className="h-3.5 w-3.5" /> {copy.dashboard.exportPanel.homepageCards}
        </Button>
      </div>
      {message ? <p className="text-xs text-text-muted">{message}</p> : null}
    </motion.section>
  );
}

function RepositoryGrid({ children }: { children: ReactNode }) {
  const gridRef = useRef<HTMLDivElement | null>(null);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const grid = gridRef.current;
    if (!grid) return;
    const links = Array.from(
      grid.querySelectorAll<HTMLAnchorElement>("a[data-repo-card-link='true']"),
    );
    if (links.length === 0) return;
    const active = document.activeElement;
    const currentIndex = links.findIndex((link) => link === active);
    if (currentIndex < 0) return;

    const cols = window.matchMedia("(min-width: 1024px)").matches
      ? 3
      : window.matchMedia("(min-width: 640px)").matches
        ? 2
        : 1;

    let nextIndex: number;
    switch (event.key) {
      case "ArrowRight":
        nextIndex = Math.min(links.length - 1, currentIndex + 1);
        break;
      case "ArrowLeft":
        nextIndex = Math.max(0, currentIndex - 1);
        break;
      case "ArrowDown":
        nextIndex = Math.min(links.length - 1, currentIndex + cols);
        break;
      case "ArrowUp":
        nextIndex = Math.max(0, currentIndex - cols);
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = links.length - 1;
        break;
      default:
        return;
    }
    if (nextIndex === currentIndex) return;
    event.preventDefault();
    links[nextIndex]?.focus();
  }

  return (
    <motion.div
      ref={gridRef}
      role="list"
      onKeyDown={onKeyDown}
      initial="hidden"
      animate="visible"
      variants={staggerContainer(0.035)}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {children}
    </motion.div>
  );
}

function RepositoryLoadingGrid() {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-label={copy.dashboard.repoSection.loading}
    >
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
  const motionProps = tourAnchor ? {} : hoverLift;
  return (
    <motion.div
      role="listitem"
      data-tour-anchor={tourAnchor}
      variants={tourAnchor ? fadeIn : fadeUp}
      {...motionProps}
    >
      <Card className="flex h-full min-h-[252px] flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/dashboard/repo/${encodeURIComponent(repository.id)}`}
              data-repo-card-link="true"
              className="block truncate text-md font-semibold text-text-primary hover:text-accent"
            >
              {repository.name}
            </Link>
            <p className="mt-1 truncate text-xs text-text-muted">{repository.fullName}</p>
          </div>
          <Github className="h-4 w-4 shrink-0 text-text-muted" strokeWidth={1.75} />
        </div>

        <p className="line-clamp-3 min-h-[60px] text-sm text-text-secondary">
          {repository.description || copy.dashboard.card.noDescription}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {analysis ? (
            <Badge tone={healthLabelTone(analysis.healthLabel)}>{analysis.healthLabel}</Badge>
          ) : null}
          {analysis?.hiddenGem.isHiddenGem ? (
            <Badge tone="accent" title={analysis.hiddenGem.reasons.join(" · ")}>
              <Gem className="h-3 w-3" /> {copy.dashboard.card.hiddenGem}
            </Badge>
          ) : null}
          {analysis && analysis.classification.type !== "unknown" ? (
            <Badge tone="accent" title={analysis.classification.reasons.join(" · ")}>
              {PROJECT_TYPE_LABELS[analysis.classification.type]}
            </Badge>
          ) : null}
          {repository.language ? <Badge>{repository.language}</Badge> : null}
          {repository.fork ? (
            <Badge tone="warn">
              <GitFork className="h-3 w-3" /> {copy.dashboard.card.fork}
            </Badge>
          ) : null}
          {repository.archived ? (
            <Badge tone="danger">
              <Archive className="h-3 w-3" /> {copy.dashboard.card.archived}
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
            <motion.div
              variants={scoreReveal}
              className="rounded-lg bg-subtle px-3 py-2 text-xs text-text-secondary"
            >
              <div className="flex items-center gap-3">
                <ScoreRing
                  value={analysis.score.total}
                  label={copy.dashboard.card.scoreLabel}
                  size={58}
                  strokeWidth={5}
                />
                <div className="min-w-0">
                  <div className="font-medium tabular-nums text-text-primary">
                    {analysis.score.total === null
                      ? copy.dashboard.card.scorePending
                      : copy.dashboard.card.scoreSummary(
                          analysis.score.total,
                          analysis.healthLabel,
                        )}
                  </div>
                  <div className="mt-1 line-clamp-2">
                    {analysis.missingSignals.length > 0
                      ? analysis.missingSignals[0]
                      : copy.dashboard.card.noGaps}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5" /> {repository.stars}
            </span>
            <span className="inline-flex items-center gap-1">
              <GitFork className="h-3.5 w-3.5" /> {repository.forks}
            </span>
            <span>{copy.dashboard.card.updated(formatDate(repository.updatedAt))}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm">
              <a href={repository.url} target="_blank" rel="noreferrer">
                <Github className="h-3.5 w-3.5" /> {copy.dashboard.card.github}
              </a>
            </Button>
            {repository.homepageUrl ? (
              <Button asChild variant="ghost" size="sm">
                <a href={repository.homepageUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> {copy.dashboard.card.homepage}
                </a>
              </Button>
            ) : null}
            <CompareToggle repositoryId={repository.id} />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function CompareToggle({ repositoryId }: { repositoryId: string }) {
  const selectedIds = useComparisonStore((s) => s.selectedIds);
  const toggle = useComparisonStore((s) => s.toggle);
  const selected = selectedIds.includes(repositoryId);
  const full = !selected && selectedIds.length >= MAX_COMPARISON;

  return (
    <Button
      type="button"
      variant={selected ? "primary" : "ghost"}
      size="sm"
      disabled={full}
      aria-pressed={selected}
      title={full ? copy.dashboard.card.compareLimit(MAX_COMPARISON) : undefined}
      onClick={() => toggle(repositoryId)}
    >
      <GitCompare className="h-3.5 w-3.5" />{" "}
      {selected ? copy.dashboard.card.compareSelected : copy.dashboard.card.compare}
    </Button>
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
      return copy.dashboard.errors.notFound;
    case "rate-limit":
      return copy.dashboard.errors.rateLimit;
    case "network":
      return copy.dashboard.errors.network;
    default:
      return copy.dashboard.errors.generic;
  }
}
