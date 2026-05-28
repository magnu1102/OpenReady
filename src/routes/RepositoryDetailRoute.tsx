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
  XCircle,
  Star,
  GitFork,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { useRepositoryStore } from "@/store/repositoryStore";
import { collectTechSignals } from "@/modules/analyzer-core";
import type { TechSignal } from "@/modules/analyzer-core";
import type {
  AnalysisResult,
  CheckCategory,
  CheckStatus,
  HealthLabel,
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
    body: "README presence and section checks. Contributing, changelog and docs folder detection arrive later.",
  },
  {
    value: "build",
    label: "Build & Tests",
    icon: Hammer,
    title: "Build and tests",
    body: "Package manifests, lockfiles, Docker, CI workflows, test directories and infrastructure-as-code signals from the repository file tree.",
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
    body: "Prioritized next steps. Phrased as a coach, not a linter — appearing alongside scoring in Phase 5–6.",
  },
];

export function RepositoryDetailRoute() {
  const { id = "example" } = useParams<{ id: string }>();
  const repositories = useRepositoryStore((s) => s.repositories);
  const analyses = useRepositoryStore((s) => s.analyses);
  const trees = useRepositoryStore((s) => s.trees);
  const repository = repositories.find((candidate) => candidate.id === id);
  const analysis = analyses.find((candidate) => candidate.repository.id === id);
  const treeState = trees[id];
  const techSignals = collectTechSignals(treeState);

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
          description="Repository details live in memory during Phase 3. Fetch a GitHub username again to reopen this view."
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
        </div>
        <Card className="flex w-full max-w-[260px] flex-col items-center gap-2 p-5">
          <ScoreRing value={null} label="Health" />
          <p className="text-xs text-text-muted">
            Numeric scoring launches in Phase 5. Phase 3 shows deterministic labels and checks.
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
                description="Metadata, activity and repository status checks from Phase 3."
                analysis={analysis}
                categories={["metadata", "activity", "status"]}
              />
              <TechStackPanel signals={techSignals} treeState={treeState} />
            </div>
            <AnalysisSummary analysis={analysis} />
          </div>
        </TabsContent>
        <TabsContent value="documentation">
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <CheckPanel
              title="Documentation checks"
              description="README presence and section checks for the first 30 fetched repositories."
              analysis={analysis}
              categories={["documentation"]}
            />
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
        <TabsContent value="presentation">
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <CheckPanel
              title="Presentation checks"
              description="README screenshot and demo signals from Phase 3."
              analysis={analysis}
              checkIds={["homepage", "readme-screenshots-demo"]}
            />
            <AnalysisSummary analysis={analysis} />
          </div>
        </TabsContent>
        <TabsContent value="recommendations">
          <PlaceholderPanel
            icon={Lightbulb}
            title="Suggested improvements"
            description="Prioritized recommendations arrive after scoring and richer checks."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
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
}: {
  signals: TechSignal[];
  treeState: RepositoryTreeState | undefined;
}) {
  const description =
    treeState?.status === "truncated"
      ? "Detected from a partial file tree — GitHub truncated the response for this large repository."
      : "Detected from filenames in the recursive Git tree.";

  if (!treeState) {
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
        <p className="text-sm text-text-secondary">Repository is empty — nothing to detect.</p>
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

  return (
    <Card className="flex flex-col gap-3">
      <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
        Phase 3 summary
      </span>
      <Badge tone={healthLabelTone(analysis.healthLabel)} className="self-start">
        {analysis.healthLabel}
      </Badge>
      <div className="text-sm text-text-secondary">
        {analysis.passedCount} passed · {analysis.failedCount} missing
        {analysis.unknownCount ? ` · ${analysis.unknownCount} unknown` : ""}
      </div>
      <div className="flex flex-col gap-1">
        {analysis.missingSignals.length > 0 ? (
          analysis.missingSignals.map((signal) => (
            <span key={signal} className="text-xs text-text-secondary">
              {signal}
            </span>
          ))
        ) : (
          <span className="text-xs text-text-secondary">No critical gaps from Phase 3 checks.</span>
        )}
      </div>
    </Card>
  );
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
