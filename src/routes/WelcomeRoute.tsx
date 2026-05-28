import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShieldCheck, UserX, BookOpen, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
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
    icon: UserX,
    title: "No account needed",
    body: "Public GitHub data only. Optional token support comes later for higher rate limits.",
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
  const status = useRepositoryStore((s) => s.status);
  const fetchRepositories = useRepositoryStore((s) => s.fetchRepositories);
  const isLoading = status === "loading";

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

  return (
    <div className="flex flex-col gap-12">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
        className="flex flex-col gap-4"
      >
        <Badge tone="accent" className="self-start">
          <Sparkles className="h-3 w-3" /> Phase 2 — public repository fetch
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
          Understand and improve your GitHub repositories.
        </h1>
        <p className="max-w-2xl text-md text-text-secondary">
          RepoPulse analyzes public GitHub repositories and turns documentation, setup, licensing
          and presentation signals into clear, actionable feedback. This phase fetches public
          repositories first; deterministic checks land next.
        </p>
      </motion.section>

      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="username" className="text-sm font-medium text-text-primary">
              GitHub username
            </label>
            <p className="text-xs text-text-secondary">
              Enter a public GitHub user account. RepoPulse fetches public repository metadata only.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
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
            <Button type="submit" variant="primary" size="md" disabled={isLoading}>
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
            Optional GitHub token support is planned later. This phase uses unauthenticated public
            GitHub API access.
          </p>
        </form>
      </Card>

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
