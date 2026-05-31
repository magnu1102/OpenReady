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
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { EmptyState } from "@/components/ui/EmptyState";
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
    label: "Overview",
    icon: LayoutDashboard,
    title: "Overview",
    body: "Summary, score breakdown and headline signals. Populated once analysis runs.",
  },
  {
    value: "documentation",
    label: "Documentation",
    icon: FileText,
    title: "Documentation checks",
    body: "README presence, section coverage and dedicated docs-folder detection.",
  },
  {
    value: "build",
    label: "Build & Tests",
    icon: Hammer,
    title: "Build and tests",
    body: "Package manifests, lockfiles, Docker, CI workflows, test directories and infrastructure-as-code signals from the repository file tree.",
  },
  {
    value: "security",
    label: "Security",
    icon: ShieldCheck,
    title: "Security hygiene",
    body: "SECURITY.md and example environment-file checks from the repository file tree.",
  },
  {
    value: "presentation",
    label: "Presentation",
    icon: ImageIcon,
    title: "Presentation checks",
    body: "Screenshots, demo links, badges and architecture diagrams — the signals that help a reader grasp a project quickly.",
  },
  {
    value: "recommendations",
    label: "Recommendations",
    icon: Lightbulb,
    title: "Suggested improvements",
    body: "Prioritized next steps generated from failed deterministic checks.",
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
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
        <EmptyState
          icon={CircleHelp}
          title="Repository details unavailable"
          description="Repository details live in memory. Fetch a GitHub username again to reopen this view."
          action={
            <Button asChild variant="primary" size="md">
              <Link to="/">Analyze a username</Link>
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
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
      </Button>

      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            {repository.name}
          </h1>
          <p className="max-w-2xl text-sm text-text-secondary">
            {repository.description || "No repository description provided."}
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
            {repository.fork ? <Badge tone="warn">Fork</Badge> : null}
            {repository.archived ? (
              <Badge tone="danger">
                <Archive className="h-3 w-3" /> Archived
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
        <Card className="flex w-full max-w-[260px] flex-col items-center gap-2 p-5">
          <ScoreRing value={analysis?.score.total ?? null} label="Score" />
          <p className="text-xs text-text-muted">
            Weighted mean of eight category scores (by project type and your settings). See the
            breakdown for evidence.
          </p>
          <Button asChild variant="secondary" size="sm">
            <a href={repository.url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> GitHub
            </a>
          </Button>
        </Card>
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
                title="Repository signals"
                description="Metadata, activity and repository status checks."
                analysis={analysis}
                categories={["metadata", "activity", "status"]}
              />
              <TechStackPanel signals={techSignals} treeState={treeState} treeStatus={treeStatus} />
              {analysis ? (
                <AiSuggestionPanel
                  title="Project summary"
                  description="Sends this repository's description, topics and detected signals to your provider to draft a short plain-English summary."
                  generateLabel="Draft summary"
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
                title="Documentation checks"
                description="README presence and section checks for the first 30 fetched repositories."
                analysis={analysis}
                categories={["documentation"]}
              />
              {analysis ? (
                <AiSuggestionPanel
                  title="README critique"
                  description="Sends the README text and the gaps OpenReady already detected to your provider for prioritized, constructive suggestions."
                  generateLabel="Critique README"
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
              title="Build, CI and infrastructure"
              description="Detected from the recursive repository file tree. Package manifests, lockfiles, Docker, GitHub Actions, tests, docs and infrastructure-as-code."
              analysis={analysis}
              categories={["buildability", "ci", "tests", "containerization", "infrastructure"]}
            />
            <AnalysisSummary analysis={analysis} />
          </div>
        </TabsContent>
        <TabsContent value="security">
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <CheckPanel
              title="Security hygiene"
              description="Lightweight public-repository hygiene checks detected from committed files."
              analysis={analysis}
              categories={["security"]}
            />
            <AnalysisSummary analysis={analysis} />
          </div>
        </TabsContent>
        <TabsContent value="presentation">
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <CheckPanel
              title="Presentation checks"
              description="README screenshot and demo signals."
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
        title="Recommendations unavailable"
        description="Run analysis again to generate improvement suggestions."
      />
    );
  }

  if (recommendations.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Looking good!"
        description="No major missing signals were found for this repository. Great work keeping it well documented and structured."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {recommendations.map((rec, index) => (
        <Card key={rec.id} className="flex gap-4 p-5">
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
                <Badge tone="success" title="Projected increase to the total score if resolved">
                  +{rec.scoreImpact} pts
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-text-secondary">{rec.description}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: RecommendationPriority }) {
  if (priority === "high") {
    return <Badge tone="danger">High priority</Badge>;
  }
  if (priority === "medium") {
    return <Badge tone="warn">Medium priority</Badge>;
  }
  return <Badge tone="neutral">Low priority</Badge>;
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
        title="Checks unavailable"
        description="Run analysis again."
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
        title="No checks in this section"
        description="This repository does not have any applicable checks for the selected section."
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
      ? "Detected from a partial file tree — GitHub truncated the response for this large repository."
      : "Detected from filenames in the recursive Git tree.";

  if (!treeState && treeStatus === "loading") {
    return (
      <Card className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-md font-semibold text-text-primary">Detected stack</h2>
          <p className="text-sm text-text-secondary">
            Fetching the repository file tree. Detection appears here once it completes.
          </p>
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
        <h2 className="text-md font-semibold text-text-primary">Detected stack</h2>
        <p className="text-sm text-text-secondary">
          File-tree detection is unavailable for this repository. OpenReady currently checks the
          first 30 fetched repositories to stay within GitHub's unauthenticated rate limit.
        </p>
      </Card>
    );
  }

  if (treeState.status === "unknown") {
    return (
      <Card className="flex flex-col gap-2">
        <h2 className="text-md font-semibold text-text-primary">Detected stack</h2>
        <p className="text-sm text-text-secondary">{treeState.message}</p>
      </Card>
    );
  }

  if (treeState.status === "empty") {
    return (
      <Card className="flex flex-col gap-2">
        <h2 className="text-md font-semibold text-text-primary">Detected stack</h2>
        <p className="text-sm text-text-secondary">Repository is empty - nothing to detect.</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-md font-semibold text-text-primary">Detected stack</h2>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
      {signals.length === 0 ? (
        <p className="text-sm text-text-secondary">
          No recognised manifests, CI, container, infra or test signals were found in this tree.
        </p>
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
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
          Score breakdown
        </span>
        <Badge tone={healthLabelTone(analysis.healthLabel)}>{analysis.healthLabel}</Badge>
      </div>
      {strongest && weakest ? (
        <p className="text-xs text-text-secondary">
          {sameCategory
            ? `${strongest.label} is the only category with applicable checks (${strongest.score ?? 0}/100).`
            : `Strongest: ${strongest.label} (${strongest.score ?? 0}). Weakest: ${weakest.label} (${weakest.score ?? 0}).`}
        </p>
      ) : (
        <p className="text-xs text-text-secondary">
          Analysis is still in progress — scores appear as data resolves.
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {score.categories.map((category) => (
          <li key={category.category} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-text-primary">
                {category.label}
                {category.weight !== 1 ? (
                  <span className="rounded-sm bg-subtle px-1 font-mono text-[10px] text-text-muted">
                    ×{category.weight}
                  </span>
                ) : null}
              </span>
              <span className="tabular-nums text-text-muted">
                {category.score === null
                  ? "N/A"
                  : `${category.score} · ${category.passed}/${category.applicable}`}
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
    ? "overridden"
    : `${classification.confidence} confidence`;
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
      <span>Project type</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-border-subtle bg-surface px-2 py-1 text-xs text-text-primary"
      >
        <option value="auto">
          Auto-detect ({PROJECT_TYPE_LABELS[classification.detectedType]})
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
