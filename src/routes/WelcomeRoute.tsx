import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Clock3,
  Database,
  ListChecks,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { fadeIn, fadeUp, staggerContainer } from "@/lib/motion";
import { copy } from "@/lib/copy";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Kbd } from "@/components/ui/Kbd";
import { Spinner } from "@/components/ui/Spinner";
import { isValidGitHubUsername } from "@/modules/github-client";
import { useRepositoryStore } from "@/store/repositoryStore";
import { useTourStore } from "@/modules/tour";
import { APP_VERSION } from "@/lib/env";

const principleIcons = [ShieldCheck, ListChecks, BookOpen];

export function WelcomeRoute() {
  const [username, setUsername] = useState("");
  const [validationError, setValidationError] = useState("");
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const status = useRepositoryStore((s) => s.status);
  const cachedAnalyses = useRepositoryStore((s) => s.cachedAnalyses);
  const fetchRepositories = useRepositoryStore((s) => s.fetchRepositories);
  const loadCachedAnalyses = useRepositoryStore((s) => s.loadCachedAnalyses);
  const restoreCachedAnalysis = useRepositoryStore((s) => s.restoreCachedAnalysis);
  // While the tour is open its overlay measures anchor positions, so the
  // screen must mount settled: no entrance animation at all.
  const tourOpen = useTourStore((s) => s.activeStep !== null);
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
      setValidationError(copy.welcome.form.validationError);
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
    <motion.div
      className="relative flex flex-col gap-10"
      variants={staggerContainer(0.08)}
      initial={tourOpen ? false : "hidden"}
      animate="visible"
    >
      {/* Static hero glow — pure decoration, no animation. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/4 -z-10 h-72 w-96 rounded-full bg-accent-subtle blur-3xl"
      />
      <motion.section variants={fadeUp} className="flex flex-col gap-4 pt-4">
        <Badge tone="accent" className="self-start font-mono">
          {copy.app.versionBadge(APP_VERSION)}
        </Badge>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-text-primary">
          {copy.welcome.heading}
        </h1>
        <p className="max-w-2xl text-md text-text-secondary">{copy.welcome.subheading}</p>
      </motion.section>

      {/* The submit button is the `welcome-cta` tour anchor: this card and its
          contents animate opacity-only so the tour overlay measures a settled
          layout. */}
      <motion.div variants={fadeIn}>
        <Card>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="username" className="text-sm font-medium text-text-primary">
                {copy.welcome.form.label}
              </label>
              <p className="text-xs text-text-secondary">{copy.welcome.form.hint}</p>
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
                  placeholder={copy.welcome.form.placeholder}
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
                {isLoading ? copy.welcome.form.submitting : copy.welcome.form.submit}
              </Button>
            </div>
            {validationError ? (
              <p id="username-error" className="text-xs font-medium text-danger">
                {validationError}
              </p>
            ) : null}
            <p className="text-xs text-text-muted">
              {copy.welcome.form.keyboardHint} Press <Kbd>/</Kbd> to focus this field or{" "}
              <Kbd>⌘K</Kbd> to open the command palette.
            </p>
          </form>
        </Card>
      </motion.div>

      {recentAnalysis ? (
        <motion.div variants={fadeUp}>
          <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={recentAnalysis.isStale ? "warn" : "success"}>
                  <Clock3 className="h-3 w-3" />
                  {recentAnalysis.isStale ? copy.welcome.cache.stale : copy.welcome.cache.fresh}
                </Badge>
                <span className="text-sm font-semibold text-text-primary">
                  {recentAnalysis.username}
                </span>
              </div>
              <p className="text-sm text-text-secondary">
                {copy.welcome.cache.summary(
                  recentAnalysis.repositoryCount,
                  formatDate(recentAnalysis.fetchedAt),
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={openCachedAnalysis}>
                <Database className="h-3.5 w-3.5" /> {copy.welcome.cache.open}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isLoading}
                onClick={refreshCachedAnalysis}
              >
                <RefreshCw className="h-3.5 w-3.5" /> {copy.welcome.cache.refresh}
              </Button>
            </div>
          </Card>
        </motion.div>
      ) : null}

      <motion.section variants={fadeUp} className="grid gap-4 sm:grid-cols-3">
        {copy.welcome.principles.map(({ title, body }, index) => {
          const Icon = principleIcons[index] ?? ShieldCheck;
          return (
            <Card key={title} className="flex flex-col gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-subtle text-accent">
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
                <p className="text-sm text-text-secondary">{body}</p>
              </div>
            </Card>
          );
        })}
      </motion.section>
    </motion.div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return copy.welcome.cache.fallbackDate;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
