import { Github, Database, Cpu, Palette } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";
import { Badge } from "@/components/ui/Badge";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SettingsRoute() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary">
          Configure how OpenReady looks and behaves. Most settings unlock as later phases land.
        </p>
      </header>

      <Section icon={<Palette className="h-4 w-4" />} title="Appearance" status="Available">
        <Row label="Theme" hint="Switch between light, dark, and matching your system.">
          <ThemeToggle />
        </Row>
      </Section>

      <Separator />

      <Section
        icon={<Github className="h-4 w-4" />}
        title="GitHub"
        status="Phase 2"
        statusTone="warn"
      >
        <Row
          label="Personal access token"
          hint="Optional token raises GitHub API rate limits. Never required, never sent anywhere else."
        >
          <Input type="password" placeholder="ghp_… (stored locally only)" disabled aria-disabled />
        </Row>
      </Section>

      <Separator />

      <Section
        icon={<Database className="h-4 w-4" />}
        title="Cache"
        status="Phase 8"
        statusTone="warn"
      >
        <Row
          label="Local analysis cache"
          hint="Analyses are cached locally to avoid re-fetching repositories on every open."
        >
          <Button variant="secondary" size="sm" disabled aria-disabled>
            Clear cache
          </Button>
        </Row>
      </Section>

      <Separator />

      <Section
        icon={<Cpu className="h-4 w-4" />}
        title="AI features"
        status="Phase 15"
        statusTone="warn"
      >
        <Row
          label="AI-assisted suggestions"
          hint="OpenReady is deterministic by design. Optional AI suggestions will be opt-in, bring-your-own-key, and never replace the core checks."
        >
          <Button variant="secondary" size="sm" disabled aria-disabled>
            Configure provider
          </Button>
        </Row>
      </Section>
    </div>
  );
}

function Section({
  icon,
  title,
  status,
  statusTone = "neutral",
  children,
}: {
  icon: React.ReactNode;
  title: string;
  status: string;
  statusTone?: "neutral" | "accent" | "warn" | "success" | "danger";
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-subtle text-text-secondary">
            {icon}
          </span>
          <h2 className="text-md font-semibold text-text-primary">{title}</h2>
        </div>
        <Badge tone={statusTone}>{status}</Badge>
      </div>
      <Card>{children}</Card>
    </section>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex max-w-md flex-col gap-1">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        {hint ? <span className="text-xs text-text-secondary">{hint}</span> : null}
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  );
}
