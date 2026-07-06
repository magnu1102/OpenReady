import { useLocation, Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { ThemeToggle } from "@/components/ThemeToggle";

const labels: Record<string, string> = {
  "": copy.shell.topBar.welcome,
  dashboard: copy.shell.topBar.dashboard,
  repo: copy.shell.topBar.repository,
  compare: copy.shell.topBar.compare,
  portfolio: copy.shell.topBar.portfolio,
  settings: copy.shell.topBar.settings,
};

export function TopBar() {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);
  const crumbs =
    segments.length === 0
      ? [{ href: "/", label: copy.shell.topBar.welcome }]
      : buildCrumbs(segments);

  return (
    <header
      className="glass-panel flex h-12 shrink-0 items-center justify-between rounded-xl px-5"
      aria-label="Breadcrumbs and actions"
    >
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={c.href} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-text-muted" />}
              {last ? (
                <span className="font-medium text-text-primary">{c.label}</span>
              ) : (
                <Link to={c.href} className={cn("text-text-secondary hover:text-text-primary")}>
                  {c.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
      <div className="flex items-center gap-2" id="topbar-actions">
        <ThemeToggle />
      </div>
    </header>
  );
}

function buildCrumbs(segments: string[]) {
  const out: { href: string; label: string }[] = [];
  let href = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    href += `/${seg}`;
    const prev = segments[i - 1];
    let label = labels[seg] ?? seg;
    if (prev === "repo") label = decodeURIComponent(seg);
    out.push({ href, label });
  }
  return out;
}
