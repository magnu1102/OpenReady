import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Compass,
  Cpu,
  Database,
  Github,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";
import { Badge } from "@/components/ui/Badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  deleteGitHubToken,
  getGitHubTokenStatus,
  validateAndStoreGitHubToken,
  type GitHubTokenStatus,
} from "@/lib/githubAuth";
import { useRepositoryStore } from "@/store/repositoryStore";
import {
  usePreferencesStore,
  DEFAULT_CATEGORY_WEIGHT,
  MAX_CATEGORY_WEIGHT,
  MIN_CATEGORY_WEIGHT,
} from "@/store/preferencesStore";
import { SCORE_CATEGORIES, type ScoreCategory } from "@/modules/scoring-engine";
import { useTourStore } from "@/modules/tour";

export function SettingsRoute() {
  const [token, setToken] = useState("");
  const [tokenStatus, setTokenStatus] = useState<GitHubTokenStatus>({
    configured: false,
    available: false,
  });
  const [tokenMessage, setTokenMessage] = useState("");
  const [tokenBusy, setTokenBusy] = useState(false);
  const cachedAnalyses = useRepositoryStore((s) => s.cachedAnalyses);
  const clearRepositoryCache = useRepositoryStore((s) => s.clearRepositoryCache);
  const loadCachedAnalyses = useRepositoryStore((s) => s.loadCachedAnalyses);
  const recomputeAnalyses = useRepositoryStore((s) => s.recomputeAnalyses);
  const cacheCount = cachedAnalyses.length;
  const categoryWeights = usePreferencesStore((s) => s.categoryWeights);
  const setCategoryWeight = usePreferencesStore((s) => s.setCategoryWeight);
  const resetWeights = usePreferencesStore((s) => s.resetWeights);
  const weightsCustomized = SCORE_CATEGORIES.some(
    ({ id }) => (categoryWeights[id] ?? DEFAULT_CATEGORY_WEIGHT) !== DEFAULT_CATEGORY_WEIGHT,
  );

  function changeWeight(category: ScoreCategory, value: number) {
    setCategoryWeight(category, value);
    void recomputeAnalyses();
  }

  function resetAllWeights() {
    resetWeights();
    void recomputeAnalyses();
  }
  const restartTour = useTourStore((s) => s.restart);
  const tourSeen = useTourStore((s) => s.seen);

  async function refreshTokenStatus() {
    try {
      const status = await getGitHubTokenStatus();
      setTokenStatus(status);
      setTokenMessage(
        status.available
          ? status.configured
            ? "A token is configured in the operating system credential store."
            : "No token is configured."
          : "Token storage is available in the desktop app.",
      );
    } catch (error) {
      setTokenStatus({ configured: false, available: false });
      setTokenMessage(errorMessage(error));
    }
  }

  useEffect(() => {
    void loadCachedAnalyses();
    const timer = window.setTimeout(() => {
      void refreshTokenStatus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCachedAnalyses]);

  async function saveToken() {
    setTokenBusy(true);
    setTokenMessage("Validating token with GitHub...");
    try {
      const status = await validateAndStoreGitHubToken(token);
      setToken("");
      setTokenStatus(status);
      setTokenMessage("GitHub token saved.");
    } catch (error) {
      setTokenMessage(errorMessage(error));
    } finally {
      setTokenBusy(false);
    }
  }

  async function removeToken() {
    setTokenBusy(true);
    try {
      const status = await deleteGitHubToken();
      setTokenStatus(status);
      setTokenMessage("GitHub token removed.");
    } catch (error) {
      setTokenMessage(errorMessage(error));
    } finally {
      setTokenBusy(false);
    }
  }

  async function clearCache() {
    await clearRepositoryCache();
  }

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
        icon={<Compass className="h-4 w-4" />}
        title="Onboarding"
        status={tourSeen ? "Completed" : "Available"}
        statusTone={tourSeen ? "success" : "neutral"}
      >
        <Row
          label="Product tour"
          hint="A four-step walkthrough covering the welcome screen, dashboard, exports, and settings."
        >
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={restartTour}
            data-tour-anchor="settings-replay"
          >
            <Compass className="h-3.5 w-3.5" />
            Replay tour
          </Button>
        </Row>
      </Section>

      <Separator />

      <Section
        icon={<Github className="h-4 w-4" />}
        title="GitHub"
        status={tokenStatus.configured ? "Configured" : "Optional"}
        statusTone={tokenStatus.configured ? "success" : "neutral"}
      >
        <Row
          label="Personal access token"
          hint="Optional token raises GitHub API rate limits. It is stored in the operating system credential store, not browser local storage."
        >
          <div className="flex w-full flex-col gap-2 sm:w-[360px]">
            <Input
              type="password"
              value={token}
              onChange={(event) => setToken(event.currentTarget.value)}
              placeholder="ghp_... or github_pat_..."
              disabled={!tokenStatus.available || tokenBusy}
              aria-disabled={!tokenStatus.available || tokenBusy}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={!tokenStatus.available || tokenBusy || token.trim().length === 0}
                onClick={saveToken}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Save token
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!tokenStatus.available || tokenBusy || !tokenStatus.configured}
                onClick={removeToken}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            </div>
            {tokenMessage ? <p className="text-xs text-text-muted">{tokenMessage}</p> : null}
          </div>
        </Row>
      </Section>

      <Separator />

      <Section
        icon={<Database className="h-4 w-4" />}
        title="Cache"
        status={cacheCount > 0 ? `${cacheCount} saved` : "Empty"}
        statusTone={cacheCount > 0 ? "success" : "neutral"}
      >
        <Row
          label="Local analysis cache"
          hint="Recent analysis snapshots are cached locally to avoid re-fetching repositories on every open."
        >
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={cacheCount === 0}
            aria-disabled={cacheCount === 0}
            onClick={clearCache}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear cache
          </Button>
        </Row>
      </Section>

      <Separator />

      <Section
        icon={<SlidersHorizontal className="h-4 w-4" />}
        title="Scoring weights"
        status={weightsCustomized ? "Customized" : "Default"}
        statusTone={weightsCustomized ? "accent" : "neutral"}
      >
        <div className="flex flex-col gap-5">
          <div className="flex max-w-xl flex-col gap-1">
            <span className="text-sm font-medium text-text-primary">
              Tune how much each category counts
            </span>
            <span className="text-xs text-text-secondary">
              These multipliers layer on top of the project-type weights, so a CLI is still judged
              like a CLI. Changes re-score every repository immediately and persist locally. Leave a
              category at {DEFAULT_CATEGORY_WEIGHT.toFixed(1)}× to keep its default weight; set it
              to {MIN_CATEGORY_WEIGHT.toFixed(1)}× to ignore it.
            </span>
          </div>
          <div className="flex flex-col divide-y divide-border-subtle">
            {SCORE_CATEGORIES.map(({ id, label }) => (
              <WeightRow
                key={id}
                label={label}
                value={categoryWeights[id] ?? DEFAULT_CATEGORY_WEIGHT}
                onChange={(value) => changeWeight(id, value)}
              />
            ))}
          </div>
          <div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!weightsCustomized}
              aria-disabled={!weightsCustomized}
              onClick={resetAllWeights}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
            </Button>
          </div>
        </div>
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

function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "OpenReady could not update GitHub token settings.";
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

function WeightRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const inputId = `weight-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <label htmlFor={inputId} className="text-sm text-text-primary">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          id={inputId}
          type="range"
          min={MIN_CATEGORY_WEIGHT}
          max={MAX_CATEGORY_WEIGHT}
          step={0.25}
          value={value}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
          className="w-40 accent-accent"
        />
        <span className="w-12 text-right text-sm font-medium tabular-nums text-text-secondary">
          {value.toFixed(2)}×
        </span>
      </div>
    </div>
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
