import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Archive,
  CheckCircle2,
  CircleHelp,
  ExternalLink,
  FileText,
  Hammer,
  ImageIcon,
  Lightbulb,
  LayoutDashboard,
  MinusCircle,
  ShieldCheck,
  XCircle,
  Star,
  GitFork,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { NotFoundIllustration } from "@/components/ui/illustrations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { AiSuggestionPanel } from "@/components/ai/AiSuggestionPanel";
import { critiqueReadme, summarizeProject } from "@/modules/ai-adapter";
import { useAiStore } from "@/store/aiStore";
import { useRepositoryStore } from "@/store/repositoryStore";
import type { TreeFetchStatus } from "@/store/repositoryStore";
import { collectTechSignals } from "@/modules/analyzer-core";
import type { TechSignal } from "@/modules/analyzer-core";
import { PROJECT_TYPE_LABELS, SELECTABLE_PROJECT_TYPES } from "@/modules/project-classifier";
import { copy } from "@/lib/copy";
import { fadeUp, scoreReveal, staggerContainer } from "@/lib/motion";
import type {
  AnalysisResult,
  CheckCategory,
  CheckStatus,
  ClassificationResult,
  Confidence,
  HealthLabel,
  ProjectType,
  Recommendation,
  RecommendationPriority,
  RepositoryTreeState,
} from "@/types";

const tabs = [
  {
    value: "overview",
    label: copy.repoDetail.tabs.overview.label,
    icon: LayoutDashboard,
    title: copy.repoDetail.tabs.overview.title,
    body: copy.repoDetail.tabs.overview.body,
  },
  {
    value: "documentation",
    label: copy.repoDetail.tabs.documentation.label,
    icon: FileText,
    title: copy.repoDetail.tabs.documentation.title,
    body: copy.repoDetail.tabs.documentation.body,
  },
  {
    value: "build",
    label: copy.repoDetail.tabs.build.label,
    icon: Hammer,
    title: copy.repoDetail.tabs.build.title,
    body: copy.repoDetail.tabs.build.body,
  },
  {
    value: "security",
    label: copy.repoDetail.tabs.security.label,
    icon: ShieldCheck,
    title: copy.repoDetail.tabs.security.title,
    body: copy.repoDetail.tabs.security.body,
  },
  {
    value: "presentation",
    label: copy.repoDetail.tabs.presentation.label,
    icon: ImageIcon,
    title: copy.repoDetail.tabs.presentation.title,
    body: copy.repoDetail.tabs.presentation.body,
  },
  {
    value: "recommendations",
    label: copy.repoDetail.tabs.recommendations.label,
    icon: Lightbulb,
    title: copy.repoDetail.tabs.recommendations.title,
    body: copy.repoDetail.tabs.recommendations.body,
  },
];

export function RepositoryDetailRoute() {
  const { id = "example" } = useParams<{ id: string }>();
  const repositories = useRepositoryStore((s) => s.repositories);
  const analyses = useRepositoryStore((s) => s.analyses);
  const trees = useRepositoryStore((s) => s.trees);
  const treeStatus = useRepositoryStore((s) => s.treeStatus);
  const overrideClassification = useRepositoryStore((s) => s.overrideClassification);
  const readmes = useRepositoryStore((s) => s.readmes);
  const aiBaseUrl = useAiStore((s) => s.baseUrl);
  const aiModel = useAiStore((s) => s.model);
  const repository = repositories.find((candidate) => candidate.id === id);
  const analysis = analyses.find((candidate) => candidate.repository.id === id);
  const treeState = trees[id];
  const techSignals = collectTechSignals(treeState);
  const readmeState = id ? readmes[id] : undefined;
  const readmeContent = readmeState?.status === "found" ? readmeState.readme.content : "";
  const aiConfig = { baseUrl: aiBaseUrl, model: aiModel };

  function handleOverride(next: string) {
    if (!repository) return;
    const value: ProjectType | null = next === "auto" ? null : (next as ProjectType);
    void overrideClassification(repository.id, value);
  }

  if (!repository) {
    return (
      <div className="flex flex-col gap-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" /> {copy.repoDetail.backToDashboard}
          </Link>
        </Button>
        <EmptyState
          illustration={<NotFoundIllustration />}
          title={copy.repoDetail.unavailable.title}
          description={copy.repoDetail.unavailable.description}
          action={
            <Button asChild variant="primary" size="md">
              <Link to="/">{copy.repoDetail.unavailable.action}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
        <Link to="/dashboard">
          <ArrowLeft className="h-4 w-4" /> {copy.repoDetail.backToDashboard}
        </Link>
      </Button>

      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            {repository.name}
          </h1>
          <p className="max-w-2xl text-sm text-text-secondary">
            {repository.description || copy.repoDetail.noDescription}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {analysis ? (
              <Badge tone={healthLabelTone(analysis.healthLabel)}>{analysis.healthLabel}</Badge>
            ) : null}
            {analysis ? <ClassificationBadge classification={analysis.classification} /> : null}
            {repository.language ? <Badge>{repository.language}</Badge> : null}
            <Badge>
              <Star className="h-3 w-3" /> {repository.stars}
            </Badge>
            <Badge>
              <GitFork className="h-3 w-3" /> {repository.forks}
            </Badge>
            {repository.fork ? <Badge tone="warn">{copy.repoDetail.fork}</Badge> : null}
            {repository.archived ? (
              <Badge tone="danger">
                <Archive className="h-3 w-3" /> {copy.repoDetail.archived}
              </Badge>
            ) : null}
          </div>
          {analysis ? (
            <ClassificationOverride
              classification={analysis.classification}
              onChange={handleOverride}
            />
          ) : null}
        </div>
        <motion.div variants={scoreReveal} initial="hidden" animate="visible">
          <Card className="flex w-full max-w-[260px] flex-col items-center gap-2 p-5">
            <ScoreRing value={analysis?.score.total ?? null} label={copy.repoDetail.scoreLabel} />
            <p className="text-center text-xs text-text-muted">{copy.repoDetail.scoreCaption}</p>
            <Button asChild variant="secondary" size="sm">
              <a href={repository.url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> {copy.repoDetail.github}
              </a>
            </Button>
          </Card>
        </motion.div>
      </header>

      <Tabs defaultValue="overview">
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              <span className="inline-flex items-center gap-1.5">
                <t.icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                {t.label}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <div className="flex flex-col gap-6">
              <CheckPanel
                title={copy.repoDetail.overview.signalsTitle}
                description={copy.repoDetail.overview.signalsDescription}
                analysis={analysis}
                categories={["metadata", "activity", "status"]}
              />
              <TechStackPanel signals={techSignals} treeState={treeState} treeStatus={treeStatus} />
              {analysis ? (
                <AiSuggestionPanel
                  title={copy.repoDetail.overview.projectSummaryTitle}
                  description={copy.repoDetail.overview.projectSummaryDescription}
                  generateLabel={copy.repoDetail.overview.projectSummaryGenerate}
                  generate={() => summarizeProject(analysis, aiConfig)}
                />
              ) : null}
            </div>
            <AnalysisSummary analysis={analysis} />
          </div>
        </TabsContent>
        <TabsContent value="documentation">
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <div className="flex flex-col gap-6">
              <CheckPanel
                title={copy.repoDetail.tabs.documentation.title}
                description={copy.repoDetail.documentation.checksDescription}
                analysis={analysis}
                categories={["documentation"]}
              />
              {analysis ? (
                <AiSuggestionPanel
                  title={copy.repoDetail.documentation.critiqueTitle}
                  description={copy.repoDetail.documentation.critiqueDescription}
                  generateLabel={copy.repoDetail.documentation.critiqueGenerate}
                  generate={() =>
                    critiqueReadme({ result: analysis, readme: readmeContent }, aiConfig)
                  }
                />
              ) : null}
            </div>
            <AnalysisSummary analysis={analysis} />
          </div>
        </TabsContent>
        <TabsContent value="build">
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <CheckPanel
              title={copy.repoDetail.build.title}
              description={copy.repoDetail.build.description}
              analysis={analysis}
              categories={["buildability", "ci", "tests", "containerization", "infrastructure"]}
            />
            <AnalysisSummary analysis={analysis} />
          </div>
        </TabsContent>
        <TabsContent value="security">
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <CheckPanel
              title={copy.repoDetail.security.title}
              description={copy.repoDetail.security.description}
              analysis={analysis}
              categories={["security"]}
            />
            <AnalysisSummary analysis={analysis} />
          </div>
        </TabsContent>
        <TabsContent value="presentation">
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <CheckPanel
              title={copy.repoDetail.presentation.title}
              description={copy.repoDetail.presentation.description}
              analysis={analysis}
              checkIds={["homepage", "readme-screenshots-demo"]}
            />
            <AnalysisSummary analysis={analysis} />
          </div>
        </TabsContent>
        <TabsContent value="recommendations">
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <RecommendationsPanel recommendations={analysis?.recommendations} />
            <AnalysisSummary analysis={analysis} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RecommendationsPanel({ recommendations }: { recommendations?: Recommendation[] }) {
  if (!recommendations) {
    return (
      <PlaceholderPanel
        icon={CircleHelp}
        title={copy.repoDetail.recommendations.unavailableTitle}
        description={copy.repoDetail.recommendations.unavailableDescription}
      />
    );
  }

  if (recommendations.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title={copy.repoDetail.recommendations.emptyTitle}
        description={copy.repoDetail.recommendations.emptyDescription}
      />
    );
  }

  return (
    <motion.div
      className="flex flex-col gap-4"
      variants={staggerContainer(0.04)}
      initial="hidden"
      animate="visible"
    >
      {recommendations.map((rec, index) => (
        <motion.div key={rec.id} variants={fadeUp}>
          <Card className="flex gap-4 p-5">
            <div className="mt-0.5 shrink-0 text-text-muted">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface font-mono text-xs font-semibold shadow-sm">
                {index + 1}
              </span>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-text-primary">{rec.title}</h3>
                <PriorityBadge priority={rec.priority} />
                {rec.scoreImpact > 0 ? (
                  <Badge tone="success" title={copy.repoDetail.recommendations.scoreImpactTitle}>
                    {copy.repoDetail.recommendations.scoreImpact(rec.scoreImpact)}
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm text-text-secondary">{rec.description}</p>
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}

function PriorityBadge({ priority }: { priority: RecommendationPriority }) {
  if (priority === "high") {
    return <Badge tone="danger">{copy.repoDetail.recommendations.high}</Badge>;
  }
  if (priority === "medium") {
    return <Badge tone="warn">{copy.repoDetail.recommendations.medium}</Badge>;
  }
  return <Badge tone="neutral">{copy.repoDetail.recommendations.low}</Badge>;
}

function CheckPanel({
  title,
  description,
  analysis,
  categories,
  checkIds,
}: {
  title: string;
  description: string;
  analysis?: AnalysisResult;
  categories?: CheckCategory[];
  checkIds?: string[];
}) {
  if (!analysis) {
    return (
      <PlaceholderPanel
        icon={CircleHelp}
        title={copy.repoDetail.checks.unavailableTitle}
        description={copy.repoDetail.checks.unavailableDescription}
      />
    );
  }

  const checks = analysis.checks.filter((check) => {
    if (checkIds) return checkIds.includes(check.id);
    if (categories) return categories.includes(check.category);
    return true;
  });

  if (checks.length === 0) {
    return (
      <PlaceholderPanel
        icon={CircleHelp}
        title={copy.repoDetail.checks.emptyTitle}
        description={copy.repoDetail.checks.emptyDescription}
      />
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-md font-semibold text-text-primary">{title}</h2>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
      <div className="flex flex-col divide-y divide-border-subtle">
        {checks.map((check) => (
          <div key={check.id} className="flex gap-3 py-3">
            <StatusIcon status={check.status} />
            <div className="min-w-0">
              <div className="text-sm font-medium text-text-primary">{check.label}</div>
              {check.evidence ? (
                <div className="mt-0.5 text-xs text-text-secondary">{check.evidence}</div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TechStackPanel({
  signals,
  treeState,
  treeStatus,
}: {
  signals: TechSignal[];
  treeState: RepositoryTreeState | undefined;
  treeStatus: TreeFetchStatus;
}) {
  const description =
    treeState?.status === "truncated"
      ? copy.repoDetail.techStack.truncated
      : copy.repoDetail.techStack.detected;

  if (!treeState && treeStatus === "loading") {
    return (
      <Card className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-md font-semibold text-text-primary">
            {copy.repoDetail.techStack.title}
          </h2>
          <p className="text-sm text-text-secondary">{copy.repoDetail.techStack.loading}</p>
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-5 w-16 rounded-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (!treeState) {
    return (
      <Card className="flex flex-col gap-2">
        <h2 className="text-md font-semibold text-text-primary">
          {copy.repoDetail.techStack.title}
        </h2>
        <p className="text-sm text-text-secondary">{copy.repoDetail.techStack.unavailable}</p>
      </Card>
    );
  }

  if (treeState.status === "unknown") {
    return (
      <Card className="flex flex-col gap-2">
        <h2 className="text-md font-semibold text-text-primary">
          {copy.repoDetail.techStack.title}
        </h2>
        <p className="text-sm text-text-secondary">{treeState.message}</p>
      </Card>
    );
  }

  if (treeState.status === "empty") {
    return (
      <Card className="flex flex-col gap-2">
        <h2 className="text-md font-semibold text-text-primary">
          {copy.repoDetail.techStack.title}
        </h2>
        <p className="text-sm text-text-secondary">{copy.repoDetail.techStack.empty}</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-md font-semibold text-text-primary">
          {copy.repoDetail.techStack.title}
        </h2>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
      {signals.length === 0 ? (
        <p className="text-sm text-text-secondary">{copy.repoDetail.techStack.none}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {signals.map((signal) => (
            <li key={signal.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Badge tone="success">{signal.label}</Badge>
              </div>
              <div className="text-xs text-text-muted">{signal.evidence.join(" · ")}</div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function AnalysisSummary({ analysis }: { analysis?: AnalysisResult }) {
  if (!analysis) {
    return (
      <Card className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-3 w-full" />
        ))}
      </Card>
    );
  }

  const { score } = analysis;
  const strongest = score.categories.find((c) => c.category === score.strongestCategory);
  const weakest = score.categories.find((c) => c.category === score.weakestCategory);
  const sameCategory = strongest && weakest && strongest.category === weakest.category;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
          {copy.repoDetail.summary.heading}
        </span>
        <Badge tone={healthLabelTone(analysis.healthLabel)}>{analysis.healthLabel}</Badge>
      </div>
      {strongest && weakest ? (
        <p className="text-xs text-text-secondary">
          {sameCategory
            ? copy.repoDetail.summary.onlyCategory(strongest.label, strongest.score ?? 0)
            : copy.repoDetail.summary.strongestWeakest(
                strongest.label,
                strongest.score ?? 0,
                weakest.label,
                weakest.score ?? 0,
              )}
        </p>
      ) : (
        <p className="text-xs text-text-secondary">{copy.repoDetail.summary.inProgress}</p>
      )}
      <ul className="flex flex-col gap-2">
        {score.categories.map((category) => (
          <li key={category.category} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-text-primary">
                {category.label}
                {category.weight !== 1 ? (
                  <span className="rounded-sm bg-subtle px-1 font-mono text-[10px] text-text-muted">
                    {copy.repoDetail.summary.weight(category.weight)}
                  </span>
                ) : null}
              </span>
              <span className="tabular-nums text-text-muted">
                {category.score === null
                  ? copy.repoDetail.summary.notApplicable
                  : copy.repoDetail.summary.categoryValue(
                      category.score,
                      category.passed,
                      category.applicable,
                    )}
              </span>
            </div>
            <ScoreBar score={category.score} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ClassificationBadge({ classification }: { classification: ClassificationResult }) {
  const label = PROJECT_TYPE_LABELS[classification.type];
  const tone = confidenceTone(classification.confidence);
  const suffix = classification.overridden
    ? copy.repoDetail.classification.overridden
    : copy.repoDetail.classification.confidence(classification.confidence);
  return (
    <Badge tone={tone} title={classification.reasons.join(" · ")}>
      {label} · {suffix}
    </Badge>
  );
}

function ClassificationOverride({
  classification,
  onChange,
}: {
  classification: ClassificationResult;
  onChange: (next: string) => void;
}) {
  const value = classification.overridden ? classification.type : "auto";
  return (
    <label className="flex items-center gap-2 text-xs text-text-muted">
      <span>{copy.repoDetail.classification.label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-border-subtle bg-surface px-2 py-1 text-xs text-text-primary"
      >
        <option value="auto">
          {copy.repoDetail.classification.autoDetect(
            PROJECT_TYPE_LABELS[classification.detectedType],
          )}
        </option>
        {SELECTABLE_PROJECT_TYPES.map((type) => (
          <option key={type} value={type}>
            {PROJECT_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
    </label>
  );
}

function confidenceTone(confidence: Confidence) {
  switch (confidence) {
    case "high":
      return "success";
    case "medium":
      return "neutral";
    case "low":
      return "warn";
  }
}

function PlaceholderPanel({
  icon,
  title,
  description,
}: {
  icon: typeof Hammer;
  title: string;
  description: string;
}) {
  return <EmptyState icon={icon} title={title} description={description} />;
}

function StatusIcon({ status }: { status: CheckStatus }) {
  switch (status) {
    case "passed":
      return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />;
    case "failed":
      return <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />;
    case "not-applicable":
      return <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />;
    case "unknown":
      return <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-warn" />;
  }
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
