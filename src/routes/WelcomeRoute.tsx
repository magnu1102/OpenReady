import { useState } from "react";
import { Search, ShieldCheck, UserX, BookOpen, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tooltip } from "@/components/ui/Tooltip";
import { Badge } from "@/components/ui/Badge";

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

  return (
    <div className="flex flex-col gap-12">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
        className="flex flex-col gap-4"
      >
        <Badge tone="accent" className="self-start">
          <Sparkles className="h-3 w-3" /> Phase 1 — app shell
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
          Understand and improve your GitHub repositories.
        </h1>
        <p className="max-w-2xl text-md text-text-secondary">
          RepoPulse analyzes public GitHub repositories and turns documentation, setup, licensing
          and presentation signals into clear, actionable feedback. The first deterministic checks
          land in the next phase — this build is the polished shell.
        </p>
      </motion.section>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="username" className="text-sm font-medium text-text-primary">
            GitHub username
          </label>
          <p className="text-xs text-text-secondary">
            Enter any public GitHub handle. Analysis will be enabled in Phase 2.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
              placeholder="octocat"
              autoComplete="off"
              spellCheck={false}
              className="pl-9"
            />
          </div>
          <Tooltip content="Repository analysis arrives in Phase 2.">
            <span className="inline-flex">
              <Button variant="primary" size="md" disabled aria-disabled>
                Analyze
              </Button>
            </span>
          </Tooltip>
        </div>
        <p className="text-xs text-text-muted">
          Optional GitHub token support is planned — it will raise rate limits and is never required.
        </p>
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
