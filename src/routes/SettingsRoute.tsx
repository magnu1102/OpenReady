import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Compass,
  Cpu,
  Database,
  Github,
  KeyRound,
  Palette,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "@/store/toastStore";
import {
  deleteGitHubToken,
  getGitHubTokenStatus,
  validateAndStoreGitHubToken,
  type GitHubTokenStatus,
} from "@/lib/githubAuth";
import {
  deleteAiConfig,
  getAiConfigStatus,
  validateAndStoreAiConfig,
  verifyAiConfig,
  type AiConfigStatus,
} from "@/lib/aiConfig";
import { useAiStore } from "@/store/aiStore";
import { useRepositoryStore } from "@/store/repositoryStore";
import { cn } from "@/lib/cn";
import {
  usePreferencesStore,
  DEFAULT_CATEGORY_WEIGHT,
  MAX_CATEGORY_WEIGHT,
  MIN_CATEGORY_WEIGHT,
} from "@/store/preferencesStore";
import { SCORE_CATEGORIES, type ScoreCategory } from "@/modules/scoring-engine";
import { useTourStore } from "@/modules/tour";
import { copy } from "@/lib/copy";
import { fadeIn } from "@/lib/motion";

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

  const aiEnabled = useAiStore((s) => s.enabled);
  const aiBaseUrl = useAiStore((s) => s.baseUrl);
  const aiModel = useAiStore((s) => s.model);
  const setAiEnabled = useAiStore((s) => s.setEnabled);
  const setAiBaseUrl = useAiStore((s) => s.setBaseUrl);
  const setAiModel = useAiStore((s) => s.setModel);
  const [aiKey, setAiKey] = useState("");
  const [aiStatus, setAiStatus] = useState<AiConfigStatus>({
    configured: false,
    available: false,
  });
  const [aiMessage, setAiMessage] = useState("");
  const [aiTone, setAiTone] = useState<"neutral" | "error" | "success">("neutral");
  const [aiBusy, setAiBusy] = useState(false);

  async function refreshAiStatus() {
    try {
      const status = await getAiConfigStatus();
      setAiStatus(status);
      setAiMessage(
        status.available
          ? status.configured
            ? copy.settings.ai.configured
            : copy.settings.ai.notConfigured
          : copy.settings.ai.unavailable,
      );
    } catch (error) {
      setAiStatus({ configured: false, available: false });
      setAiMessage(errorMessage(error));
    }
  }

  async function saveAiKey() {
    setAiBusy(true);
    setAiTone("neutral");
    setAiMessage(copy.settings.ai.saving);
    try {
      const status = await validateAndStoreAiConfig(aiKey);
      setAiKey("");
      setAiStatus(status);
      setAiTone("success");
      setAiMessage(copy.settings.ai.configured);
      toast.success(copy.toasts.aiKeySaved);
    } catch (error) {
      setAiTone("error");
      setAiMessage(errorMessage(error));
    } finally {
      setAiBusy(false);
    }
  }

  async function removeAiKey() {
    setAiBusy(true);
    try {
      const status = await deleteAiConfig();
      setAiStatus(status);
      setAiTone("neutral");
      setAiMessage(copy.settings.ai.notConfigured);
      toast.success(copy.toasts.aiKeyRemoved);
    } catch (error) {
      setAiTone("error");
      setAiMessage(errorMessage(error));
    } finally {
      setAiBusy(false);
    }
  }

  async function verifyAiKey() {
    setAiBusy(true);
    setAiTone("neutral");
    setAiMessage(copy.settings.ai.verifying);
    try {
      const result = await verifyAiConfig(aiBaseUrl);
      setAiTone(result.ok ? "success" : "error");
      setAiMessage(result.message);
      if (result.ok) {
        toast.success(copy.toasts.aiKeyVerified);
      } else {
        toast.error(copy.toasts.aiKeyVerifyFailed(result.message));
      }
    } catch (error) {
      setAiTone("error");
      setAiMessage(errorMessage(error));
    } finally {
      setAiBusy(false);
    }
  }

  async function refreshTokenStatus() {
    try {
      const status = await getGitHubTokenStatus();
      setTokenStatus(status);
      setTokenMessage(
        status.available
          ? status.configured
            ? copy.settings.github.configured
            : copy.settings.github.notConfigured
          : copy.settings.github.unavailable,
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
      void refreshAiStatus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCachedAnalyses]);

  async function saveToken() {
    setTokenBusy(true);
    setTokenMessage(copy.settings.github.validating);
    try {
      const status = await validateAndStoreGitHubToken(token);
      setToken("");
      setTokenStatus(status);
      setTokenMessage(copy.settings.github.configured);
      toast.success(copy.toasts.tokenSaved);
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
      setTokenMessage(copy.settings.github.notConfigured);
      toast.success(copy.toasts.tokenRemoved);
    } catch (error) {
      setTokenMessage(errorMessage(error));
    } finally {
      setTokenBusy(false);
    }
  }

  async function clearCache() {
    await clearRepositoryCache();
    toast.success(copy.toasts.cacheCleared);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          {copy.settings.title}
        </h1>
        <p className="text-sm text-text-secondary">{copy.settings.subtitle}</p>
      </header>

      <Section
        icon={<Palette className="h-4 w-4" />}
        title={copy.settings.appearance.title}
        status={copy.settings.statuses.available}
      >
        <Row label={copy.settings.appearance.themeLabel} hint={copy.settings.appearance.themeHint}>
          <ThemeToggle />
        </Row>
      </Section>

      <Section
        icon={<Compass className="h-4 w-4" />}
        title={copy.settings.onboarding.title}
        status={tourSeen ? copy.settings.statuses.completed : copy.settings.statuses.available}
        statusTone={tourSeen ? "success" : "neutral"}
      >
        <Row
          label={copy.settings.onboarding.productTourLabel}
          hint={copy.settings.onboarding.productTourHint}
        >
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={restartTour}
            data-tour-anchor="settings-replay"
          >
            <Compass className="h-3.5 w-3.5" />
            {copy.settings.onboarding.replay}
          </Button>
        </Row>
      </Section>

      <Section
        icon={<Github className="h-4 w-4" />}
        title={copy.settings.github.title}
        status={
          tokenStatus.configured
            ? copy.settings.statuses.configured
            : copy.settings.statuses.optional
        }
        statusTone={tokenStatus.configured ? "success" : "neutral"}
      >
        <Row label={copy.settings.github.tokenLabel} hint={copy.settings.github.tokenHint}>
          <div className="flex w-full flex-col gap-2 sm:w-[360px]">
            <Input
              type="password"
              value={token}
              onChange={(event) => setToken(event.currentTarget.value)}
              placeholder={copy.settings.github.tokenPlaceholder}
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
                <CheckCircle2 className="h-3.5 w-3.5" /> {copy.settings.github.save}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!tokenStatus.available || tokenBusy || !tokenStatus.configured}
                onClick={removeToken}
              >
                <Trash2 className="h-3.5 w-3.5" /> {copy.settings.github.remove}
              </Button>
            </div>
            {tokenMessage ? <p className="text-xs text-text-muted">{tokenMessage}</p> : null}
          </div>
        </Row>
      </Section>

      <Section
        icon={<Database className="h-4 w-4" />}
        title={copy.settings.cache.title}
        status={
          cacheCount > 0 ? copy.settings.statuses.saved(cacheCount) : copy.settings.statuses.empty
        }
        statusTone={cacheCount > 0 ? "success" : "neutral"}
      >
        <Row label={copy.settings.cache.label} hint={copy.settings.cache.hint}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={cacheCount === 0}
            aria-disabled={cacheCount === 0}
            onClick={clearCache}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {copy.settings.cache.clear}
          </Button>
        </Row>
      </Section>

      <Section
        icon={<SlidersHorizontal className="h-4 w-4" />}
        title={copy.settings.weights.title}
        status={
          weightsCustomized ? copy.settings.statuses.customized : copy.settings.statuses.default
        }
        statusTone={weightsCustomized ? "accent" : "neutral"}
      >
        <div className="flex flex-col gap-5">
          <div className="flex max-w-xl flex-col gap-1">
            <span className="text-sm font-medium text-text-primary">
              {copy.settings.weights.heading}
            </span>
            <span className="text-xs text-text-secondary">
              {copy.settings.weights.description(
                DEFAULT_CATEGORY_WEIGHT.toFixed(1),
                MIN_CATEGORY_WEIGHT.toFixed(1),
              )}
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
              <RotateCcw className="h-3.5 w-3.5" /> {copy.settings.weights.reset}
            </Button>
          </div>
        </div>
      </Section>

      <Section
        icon={<Cpu className="h-4 w-4" />}
        title={copy.settings.ai.title}
        status={
          aiEnabled
            ? aiStatus.configured
              ? copy.settings.statuses.enabled
              : copy.settings.statuses.keyNeeded
            : copy.settings.statuses.off
        }
        statusTone={aiEnabled ? (aiStatus.configured ? "success" : "warn") : "neutral"}
      >
        <div className="flex flex-col gap-5">
          <Row label={copy.settings.ai.label} hint={copy.settings.ai.hint}>
            <Switch
              checked={aiEnabled}
              onCheckedChange={setAiEnabled}
              label={copy.settings.ai.switchLabel}
            />
          </Row>

          <Row label={copy.settings.ai.baseUrlLabel} hint={copy.settings.ai.baseUrlHint}>
            <Input
              value={aiBaseUrl}
              onChange={(event) => setAiBaseUrl(event.currentTarget.value)}
              placeholder={copy.settings.ai.baseUrlPlaceholder}
              spellCheck={false}
              disabled={!aiEnabled}
              aria-disabled={!aiEnabled}
              className="w-full sm:w-[360px]"
            />
          </Row>

          <Row label={copy.settings.ai.modelLabel} hint={copy.settings.ai.modelHint}>
            <Input
              value={aiModel}
              onChange={(event) => setAiModel(event.currentTarget.value)}
              placeholder={copy.settings.ai.modelPlaceholder}
              spellCheck={false}
              disabled={!aiEnabled}
              aria-disabled={!aiEnabled}
              className="w-full sm:w-[360px]"
            />
          </Row>

          <Row label={copy.settings.ai.keyLabel} hint={copy.settings.ai.keyHint}>
            <div className="flex w-full flex-col gap-2 sm:w-[360px]">
              {aiStatus.configured ? (
                <div className="bg-subtle/60 flex flex-col gap-3 rounded-lg border border-glass-border p-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 shrink-0 text-text-muted" />
                    <code className="min-w-0 truncate font-mono text-sm text-text-primary">
                      {aiStatus.keyPreview ?? copy.settings.ai.storedFallback}
                    </code>
                    <Badge tone="success" className="ml-auto shrink-0">
                      {copy.settings.ai.storedBadge}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="shrink-0 whitespace-nowrap"
                      disabled={!aiEnabled || !aiStatus.available || aiBusy}
                      onClick={verifyAiKey}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> {copy.settings.ai.verify}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="shrink-0 whitespace-nowrap"
                      disabled={!aiStatus.available || aiBusy}
                      onClick={removeAiKey}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {copy.settings.ai.delete}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Input
                    type="password"
                    value={aiKey}
                    onChange={(event) => setAiKey(event.currentTarget.value)}
                    placeholder={copy.settings.ai.keyPlaceholder}
                    spellCheck={false}
                    disabled={!aiEnabled || !aiStatus.available || aiBusy}
                    aria-disabled={!aiEnabled || !aiStatus.available || aiBusy}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className="shrink-0 whitespace-nowrap"
                      disabled={
                        !aiEnabled || !aiStatus.available || aiBusy || aiKey.trim().length === 0
                      }
                      onClick={saveAiKey}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> {copy.settings.ai.save}
                    </Button>
                  </div>
                </>
              )}
              {aiMessage ? (
                <p
                  className={cn(
                    "text-xs",
                    aiTone === "error"
                      ? "font-medium text-danger"
                      : aiTone === "success"
                        ? "font-medium text-success"
                        : "text-text-muted",
                  )}
                >
                  {aiMessage}
                </p>
              ) : null}
            </div>
          </Row>

          <p className="max-w-2xl text-xs text-text-muted">{copy.settings.ai.disclosure}</p>
        </div>
      </Section>
    </div>
  );
}

function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return copy.settings.github.fallbackError;
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
    <motion.section className="flex flex-col" variants={fadeIn} initial="hidden" animate="visible">
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-subtle text-text-secondary">
              {icon}
            </span>
            <h2 className="truncate text-md font-semibold text-text-primary">{title}</h2>
          </div>
          <Badge tone={statusTone}>{status}</Badge>
        </div>
        <div className="flex flex-col gap-4">{children}</div>
      </Card>
    </motion.section>
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
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <label htmlFor={inputId} className="text-sm text-text-primary">
        {label}
      </label>
      <div className="flex min-w-0 items-center gap-3">
        <input
          id={inputId}
          type="range"
          min={MIN_CATEGORY_WEIGHT}
          max={MAX_CATEGORY_WEIGHT}
          step={0.25}
          value={value}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
          className="min-w-0 flex-1 accent-accent sm:w-40 sm:flex-none"
        />
        <span className="w-12 text-right text-sm font-medium tabular-nums text-text-secondary">
          {copy.settings.weights.value(value.toFixed(2))}
        </span>
      </div>
    </div>
  );
}

function Switch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-micro ease-soft",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        checked ? "border-accent bg-accent" : "bg-subtle/80 border-glass-border",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-surface shadow-sm transition-transform duration-micro ease-soft",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
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
      <div className="flex min-w-0 max-w-full items-center sm:shrink-0">{children}</div>
    </div>
  );
}
