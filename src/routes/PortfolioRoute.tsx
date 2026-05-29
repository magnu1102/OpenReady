import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Download, FileText, MessageSquare, Pin, PinOff } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { useRepositoryStore } from "@/store/repositoryStore";
import { usePortfolioStore } from "@/store/portfolioStore";
import { collectTechSignals } from "@/modules/analyzer-core";
import type { TechSignal } from "@/modules/analyzer-core";
import {
  ROLE_LABELS,
  SELECTABLE_ROLES,
  buildCvBullets,
  buildTalkingPoints,
  rolePreset,
  selectFeatured,
  suggestRole,
  type RoleId,
} from "@/modules/portfolio";
import {
  exportCvBullets,
  exportPortfolioMarkdown,
  exportTalkingPointsMarkdown,
  suggestedExportFilename,
  type ExportFormat,
} from "@/modules/export-engine";
import { saveExportFile } from "@/lib/exportFiles";

export function PortfolioRoute() {
  const username = useRepositoryStore((s) => s.username);
  const analyses = useRepositoryStore((s) => s.analyses);
  const trees = useRepositoryStore((s) => s.trees);
  const role = usePortfolioStore((s) => s.role);
  const overrides = usePortfolioStore((s) => s.overrides);
  const setRole = usePortfolioStore((s) => s.setRole);
  const togglePin = usePortfolioStore((s) => s.togglePin);
  const [message, setMessage] = useState<{ tone: "neutral" | "error"; text: string }>({
    tone: "neutral",
    text: "",
  });

  const signalsById = useMemo(() => {
    const map: Record<string, TechSignal[]> = {};
    for (const analysis of analyses) {
      map[analysis.repository.id] = collectTechSignals(trees[analysis.repository.id]);
    }
    return map;
  }, [analyses, trees]);

  const effectiveRole: RoleId = role === "auto" ? suggestRole(analyses, signalsById) : role;
  const preset = rolePreset(effectiveRole);
  const featured = useMemo(
    () => selectFeatured(analyses, signalsById, effectiveRole, overrides),
    [analyses, signalsById, effectiveRole, overrides],
  );
  const cvEntries = useMemo(
    () => buildCvBullets(featured, effectiveRole),
    [featured, effectiveRole],
  );

  if (analyses.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No analysis to build a portfolio from"
        description="Analyze a GitHub username first — Portfolio mode turns those results into a role-targeted highlight reel, CV bullets, and interview prep."
        action={
          <Button asChild variant="primary" size="md">
            <Link to="/dashboard">Go to dashboard</Link>
          </Button>
        }
      />
    );
  }

  async function runExport(format: ExportFormat) {
    const generatedAt = new Date().toISOString();
    const portfolioInput = {
      username,
      analyses,
      signalsById,
      role: effectiveRole,
      overrides,
      generatedAt,
    };
    const content =
      format === "portfolio"
        ? exportPortfolioMarkdown(portfolioInput)
        : format === "cv"
          ? exportCvBullets(portfolioInput)
          : exportTalkingPointsMarkdown(portfolioInput);

    try {
      const result = await saveExportFile({
        format,
        content,
        defaultPath: suggestedExportFilename(format, username),
      });
      setMessage(
        result.status === "saved"
          ? { tone: "neutral", text: "Export saved." }
          : { tone: "neutral", text: "" },
      );
    } catch {
      setMessage({
        tone: "error",
        text: "OpenReady could not save the export. Choose a writable location and try again.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Portfolio</h1>
        <p className="text-sm text-text-secondary">
          A role-targeted view of {username ? `${username}'s` : "your"} strongest work, with CV
          bullets and interview prep generated from the analysis.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="role-select" className="text-sm font-medium text-text-primary">
            Target role
          </label>
          <p className="text-xs text-text-secondary">{preset.blurb}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            id="role-select"
            value={role}
            onChange={(event) => setRole(event.currentTarget.value as RoleId | "auto")}
            className="rounded-md border border-border-default bg-surface px-3 py-2 text-sm text-text-primary"
          >
            <option value="auto">
              Auto-detected: {ROLE_LABELS[suggestRole(analyses, signalsById)]}
            </option>
            {SELECTABLE_ROLES.map((id) => (
              <option key={id} value={id}>
                {ROLE_LABELS[id]}
              </option>
            ))}
          </select>
          {role === "auto" ? <Badge tone="accent">Auto</Badge> : null}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-text-primary">Featured projects</h2>
        {featured.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No repositories match this role yet. Pin repositories below or pick a different role.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {featured.map(({ analysis, reasons, pinned }) => (
              <Card key={analysis.repository.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to={`/dashboard/repo/${encodeURIComponent(analysis.repository.id)}`}
                      className="block truncate text-md font-semibold text-text-primary hover:text-accent"
                    >
                      {analysis.repository.name}
                    </Link>
                    <p className="truncate text-xs text-text-muted">
                      {analysis.repository.fullName}
                    </p>
                  </div>
                  <ScoreRing value={analysis.score.total} label="Score" size={56} strokeWidth={5} />
                </div>
                {reasons.length > 0 ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {reasons.map((reason) => (
                      <li key={reason}>
                        <Badge tone="neutral">{reason}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-auto flex items-center gap-2">
                  <Button
                    type="button"
                    variant={pinned ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => togglePin(analysis.repository.id)}
                  >
                    {pinned ? (
                      <>
                        <Pin className="h-3.5 w-3.5" /> Pinned
                      </>
                    ) : (
                      <>
                        <PinOff className="h-3.5 w-3.5" /> Auto
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-text-primary">CV bullet points</h2>
        {cvEntries.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Feature a repository to generate CV bullets.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {cvEntries.map((entry) => (
              <Card key={entry.repoId} className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-text-primary">{entry.name}</h3>
                <ul className="flex flex-col gap-1.5 text-sm text-text-secondary">
                  {entry.bullets.map((bullet) => (
                    <li key={bullet}>• {bullet}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-text-primary">Interview talking points</h2>
        <div className="flex flex-col gap-4">
          {featured.map(({ analysis }) => {
            const points = buildTalkingPoints(analysis, signalsById[analysis.repository.id] ?? []);
            return (
              <Card key={analysis.repository.id} className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-text-primary">{points.name}</h3>
                <TalkingList title="Highlights" items={points.highlights} />
                <TalkingList title="Likely questions" items={points.likelyQuestions} />
                <TalkingList
                  title="Gaps to own"
                  items={
                    points.gapsToOwn.length > 0 ? points.gapsToOwn : ["No major gaps detected."]
                  }
                />
              </Card>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-border-subtle pt-6">
        <h2 className="text-lg font-semibold text-text-primary">Exports</h2>
        <p className="text-sm text-text-secondary">
          Save the {preset.label} portfolio, CV bullets, or interview prep as Markdown.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => runExport("portfolio")}
          >
            <Download className="h-3.5 w-3.5" /> Portfolio
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => runExport("cv")}>
            <FileText className="h-3.5 w-3.5" /> CV bullets
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => runExport("talking-points")}
          >
            <MessageSquare className="h-3.5 w-3.5" /> Talking points
          </Button>
        </div>
        {message.text ? (
          <p
            className={
              message.tone === "error"
                ? "text-xs font-medium text-danger"
                : "text-xs text-text-muted"
            }
          >
            {message.text}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function TalkingList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wider text-text-muted">{title}</span>
      <ul className="flex flex-col gap-1 text-sm text-text-secondary">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}
