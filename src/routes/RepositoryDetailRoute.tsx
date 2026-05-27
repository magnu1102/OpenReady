import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Hammer,
  ImageIcon,
  Lightbulb,
  LayoutDashboard,
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
    body: "README sections, license, contributing, changelog and docs folder detection. Section-level rules land with Phase 3.",
  },
  {
    value: "build",
    label: "Build & Tests",
    icon: Hammer,
    title: "Build and tests",
    body: "Package manifests, lockfiles, Docker, CI workflows, test directories and coverage hints. Coming in Phase 3–4.",
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

  return (
    <div className="flex flex-col gap-8">
      <Button asChild variant="ghost" size="sm" className="self-start -ml-2">
        <Link to="/dashboard">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
      </Button>

      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">{id}</h1>
          <p className="max-w-2xl text-sm text-text-secondary">
            Placeholder repository view. Real metadata, scoring evidence and recommendations arrive
            in later phases.
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge>TypeScript</Badge>
            <Badge>
              <Star className="h-3 w-3" /> —
            </Badge>
            <Badge>
              <GitFork className="h-3 w-3" /> —
            </Badge>
            <Badge tone="warn">Phase 1 stub</Badge>
          </div>
        </div>
        <Card className="flex w-full max-w-[260px] flex-col items-center gap-2 p-5">
          <ScoreRing value={null} label="Health" />
          <p className="text-xs text-text-muted">
            Scoring is transparent and evidence-based. It launches with Phase 5.
          </p>
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
        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
              <EmptyState icon={t.icon} title={t.title} description={t.body} />
              <Card className="flex flex-col gap-3">
                <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Score breakdown
                </span>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-2.5 w-20" />
                    <Skeleton className="h-2.5 flex-1" />
                    <Skeleton className="h-2.5 w-8" />
                  </div>
                ))}
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
