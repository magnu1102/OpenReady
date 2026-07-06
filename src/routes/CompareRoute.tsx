import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Gem, X } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { CompareIllustration } from "@/components/ui/illustrations";
import { useRepositoryStore } from "@/store/repositoryStore";
import { useComparisonStore } from "@/store/comparisonStore";
import { PROJECT_TYPE_LABELS } from "@/modules/project-classifier";
import { copy } from "@/lib/copy";
import { fadeUp, hoverLift, staggerContainer } from "@/lib/motion";
import type { AnalysisResult, HealthLabel } from "@/types";

export function CompareRoute() {
  const analyses = useRepositoryStore((s) => s.analyses);
  const selectedIds = useComparisonStore((s) => s.selectedIds);
  const toggle = useComparisonStore((s) => s.toggle);
  const clear = useComparisonStore((s) => s.clear);

  const byId = new Map(analyses.map((analysis) => [analysis.repository.id, analysis]));
  const selected = selectedIds
    .map((id) => byId.get(id))
    .filter((analysis): analysis is AnalysisResult => Boolean(analysis));
  const compareGridStyle = {
    "--compare-columns": `repeat(${selected.length}, minmax(0, 1fr))`,
  } as CSSProperties;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            {copy.compare.title}
          </h1>
          <p className="text-sm text-text-secondary">{copy.compare.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link to="/dashboard">
              <ArrowLeft className="h-3.5 w-3.5" /> {copy.compare.backToDashboard}
            </Link>
          </Button>
          {selected.length > 0 ? (
            <Button type="button" variant="ghost" size="sm" onClick={clear}>
              <X className="h-3.5 w-3.5" /> {copy.compare.clearSelection}
            </Button>
          ) : null}
        </div>
      </header>

      {selected.length < 2 ? (
        <EmptyState
          illustration={<CompareIllustration />}
          title={copy.compare.empty.title}
          description={copy.compare.empty.description}
          action={
            <Button asChild variant="primary" size="md">
              <Link to="/dashboard">{copy.compare.empty.action}</Link>
            </Button>
          }
        />
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer(0.05)}
          className="grid gap-4 lg:[grid-template-columns:var(--compare-columns)]"
          style={compareGridStyle}
        >
          {selected.map((analysis) => (
            <ComparisonColumn key={analysis.repository.id} analysis={analysis} onRemove={toggle} />
          ))}
        </motion.div>
      )}
    </div>
  );
}

function ComparisonColumn({
  analysis,
  onRemove,
}: {
  analysis: AnalysisResult;
  onRemove: (id: string) => void;
}) {
  const { repository, score, classification, hiddenGem, healthLabel } = analysis;
  const gaps = analysis.missingSignals.slice(0, 3);

  return (
    <motion.div variants={fadeUp} {...hoverLift}>
      <Card className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to={`/dashboard/repo/${encodeURIComponent(repository.id)}`}
              className="block truncate text-md font-semibold text-text-primary hover:text-accent"
            >
              {repository.name}
            </Link>
            <p className="truncate text-xs text-text-muted">{repository.fullName}</p>
          </div>
          <button
            type="button"
            aria-label={copy.compare.column.remove(repository.name)}
            className="shrink-0 rounded-md p-1 text-text-muted hover:bg-subtle hover:text-text-primary"
            onClick={() => onRemove(repository.id)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-2 rounded-lg bg-subtle px-4 py-5">
          <ScoreRing value={score.total} label={copy.compare.column.scoreLabel} size={104} />
          <div className="flex flex-wrap justify-center gap-1.5">
            <Badge tone={healthLabelTone(healthLabel)}>{healthLabel}</Badge>
            {classification.type !== "unknown" ? (
              <Badge tone="accent">{PROJECT_TYPE_LABELS[classification.type]}</Badge>
            ) : null}
            {hiddenGem.isHiddenGem ? (
              <Badge tone="accent" title={hiddenGem.reasons.join(" · ")}>
                <Gem className="h-3 w-3" /> {copy.compare.column.hiddenGem}
              </Badge>
            ) : null}
          </div>
        </div>

        <dl className="flex flex-col gap-2 border-t border-border-subtle pt-3">
          {score.categories.map((category) => (
            <div key={category.category} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <dt className="text-text-secondary">
                  {category.label}
                  {category.weight !== 1 ? (
                    <span className="ml-1 text-text-muted">
                      {copy.compare.column.weight(category.weight)}
                    </span>
                  ) : null}
                </dt>
                <dd className="font-medium tabular-nums text-text-primary">
                  {category.score === null ? copy.common.notAvailable : category.score}
                </dd>
              </div>
              <ScoreBar score={category.score} />
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-1.5 border-t border-border-subtle pt-3">
          <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
            {copy.compare.column.topGaps}
          </span>
          {gaps.length > 0 ? (
            <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-text-secondary">
              {gaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-text-muted">{copy.compare.column.noGaps}</p>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function healthLabelTone(label: HealthLabel) {
  switch (label) {
    case "Portfolio-ready":
      return "success";
    case "Needs work":
    case "Stale":
      return "warn";
    case "Experimental":
    case "Archived":
      return "danger";
    default:
      return "neutral";
  }
}
