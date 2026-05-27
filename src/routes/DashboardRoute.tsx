import { Link } from "react-router-dom";
import { Inbox, GitFork, Activity, ShieldQuestion } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tooltip } from "@/components/ui/Tooltip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

const stats = [
  { label: "Repositories", icon: GitFork, hint: "Total public repos analyzed." },
  { label: "Average health", icon: Activity, hint: "Mean score across all repos." },
  { label: "Portfolio-ready", icon: ShieldQuestion, hint: "Repos passing the readiness bar." },
  { label: "Missing signals", icon: Inbox, hint: "Common gaps across your repos." },
];

export function DashboardRoute() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary">
          Overview of analyzed repositories. Populated once analysis runs.
        </p>
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
        {stats.map(({ label, icon: Icon, hint }) => (
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
                <div className="mt-3 text-3xl font-semibold tabular-nums text-text-primary">—</div>
                <div className="mt-1 text-xs text-text-muted">Run analysis to populate</div>
              </Card>
            </Tooltip>
          </motion.div>
        ))}
      </motion.div>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Repositories</h2>
          <span className="text-xs text-text-muted">Preview layout</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              {i === 0 && (
                <Link
                  to="/dashboard/repo/example"
                  className="text-xs font-medium text-accent hover:text-accent-hover"
                >
                  View placeholder repository →
                </Link>
              )}
            </Card>
          ))}
        </div>
      </section>

      <EmptyState
        icon={Inbox}
        title="No repositories analyzed yet"
        description="Once Phase 2 lands, analyzing a GitHub username will populate this dashboard with health scores, breakdowns and recommendations."
        action={
          <Button asChild variant="primary" size="md">
            <Link to="/">Back to Welcome</Link>
          </Button>
        }
      />
    </div>
  );
}
