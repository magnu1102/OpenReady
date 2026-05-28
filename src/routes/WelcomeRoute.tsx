import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Clock3, Database, RefreshCw, Search, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { isValidGitHubUsername } from "@/modules/github-client";
import { useRepositoryStore } from "@/store/repositoryStore";

const principles = [
  {
    icon: ShieldCheck,
    title: "Local-first",
    body: "Analysis runs on your machine. Repository contents stay where they belong.",
  },
  {
    icon: Database,
    title: "Local cache",
    body: "Recent analyses can reopen instantly and stay on your machine.",
  },
  {
    icon: BookOpen,
    title: "Open source",
    body: "Free, inspectable, and built to grow alongside the people who use it.",
  },
];

export function WelcomeRoute() {
  const [username, setUsername] = useState("");
  const [validationError, setValidationError] = useState("");
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const reducedMotion = useReducedMotion();
  const status = useRepositoryStore((s) => s.status);
  const cachedAnalyses = useRepositoryStore((s) => s.cachedAnalyses);
  const fetchRepositories = useRepositoryStore((s) => s.fetchRepositories);
  const loadCachedAnalyses = useRepositoryStore((s) => s.loadCachedAnalyses);
  const restoreCachedAnalysis = useRepositoryStore((s) => s.restoreCachedAnalysis);
  const isLoading = status === "loading";
  const recentAnalysis = cachedAnalyses[0];

  useEffect(() => {
    void loadCachedAnalyses();
  }, [loadCachedAnalyses]);

  // Press "/" anywhere on the welcome screen to jump to the username input,
  // matching the GitHub keyboard convention.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "/") return;
      const active = document.activeElement;
      const tag = active?.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || (active as HTMLElement)?.isContentEditable)
        return;
      event.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = username.trim();

    if (!isValidGitHubUsername(normalized)) {
      setValidationError("Enter a GitHub username, not a URL or repository path.");
      return;
    }

    setValidationError("");
    try {
      await fetchRepositories(normalized);
    } catch {
      // The dashboard renders the actionable error state from the repository store.
    } finally {
      navigate("/dashboard");
    }
  }

  async function openCachedAnalysis() {
    if (!recentAnalysis) return;
    const restored = await restoreCachedAnalysis(recentAnalysis.username);
    if (restored) navigate("/dashboard");
  }

  async function refreshCachedAnalysis() {
    if (!recentAnalysis) return;
    try {
      await fetchRepositories(recentAnalysis.username, { forceRefresh: true });
    } catch {
      // The dashboard renders the actionable error state from the repository store.
    } finally {
      navigate("/dashboard");
    }
  }

  return (
    <div className="flex flex-col gap-12">
      <motion.section
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
        className="flex flex-col gap-4"
      >
        <Badge tone="accent" className="self-start">
          <Sparkles className="h-3 w-3" /> Phase 8 - local cache and settings
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
          Understand and improve your GitHub repositories.
        </h1>
        <p className="max-w-2xl text-md text-text-secondary">
          OpenReady analyzes public GitHub repositories and turns metadata, README, build and
          presentation signals into clear, actionable feedback with transparent numeric scores per
          category, per-repository recommendations and exportable reports.
        </p>
      </motion.section>

      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="username" className="text-sm font-medium text-text-primary">
              GitHub username
            </label>
            <p className="text-xs text-text-secondary">
              Enter a public GitHub user account. OpenReady fetches public repository metadata only.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                ref={inputRef}
                id="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.currentTarget.value);
                  setValidationError("");
                }}
                placeholder="octocat"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={validationError ? true : undefined}
                aria-describedby={validationError ? "username-error" : undefined}
                className="pl-9"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isLoading}
              data-tour-anchor="welcome-cta"
            >
              {isLoading ? <Spinner className="text-white" /> : null}
              {isLoading ? "Fetching" : "Analyze"}
            </Button>
          </div>
          {validationError ? (
            <p id="username-error" className="text-xs font-medium text-danger">
              {validationError}
            </p>
          ) : null}
          <p className="text-xs text-text-muted">
            Optional token support can raise GitHub API limits from Settings.
          </p>
        </form>
      </Card>

      {recentAnalysis ? (
        <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={recentAnalysis.isStale ? "warn" : "success"}>
                <Clock3 className="h-3 w-3" />
                {recentAnalysis.isStale ? "Refresh suggested" : "Recent cache"}
              </Badge>
              <span className="text-sm font-semibold text-text-primary">
                {recentAnalysis.username}
              </span>
            </div>
            <p className="text-sm text-text-secondary">
              {recentAnalysis.repositoryCount} repositories saved locally. Last fetched{" "}
              {formatDate(recentAnalysis.fetchedAt)}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={openCachedAnalysis}>
              <Database className="h-3.5 w-3.5" /> Open cached
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isLoading}
              onClick={refreshCachedAnalysis}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        {principles.map(({ icon: Icon, title, body }) => (
          <Card key={title} className="flex flex-col gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-subtle text-accent">
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
              <p className="text-sm text-text-secondary">{body}</p>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
