import { useState } from "react";
import { Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useAiStore } from "@/store/aiStore";
import { toast } from "@/store/toastStore";
import type { AiSuggestion } from "@/modules/ai-adapter";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";

interface AiSuggestionPanelProps {
  /** Short title describing what this panel produces, e.g. "README critique". */
  title: string;
  /** One line telling the user what will be sent to their provider. */
  description: string;
  /** Runs the AI request. Throws on failure with a user-friendly message. */
  generate: () => Promise<AiSuggestion>;
  generateLabel?: string;
  surface?: "glass" | "nested";
  className?: string;
}

/**
 * A clearly-labeled, opt-in AI panel. It renders nothing automatically: the user
 * must press Generate, and the button is disabled until AI features are enabled
 * in Settings. Deterministic output always lives outside (and above) this panel.
 */
export function AiSuggestionPanel({
  title,
  description,
  generate,
  generateLabel = copy.aiSuggestion.defaultGenerate,
  surface = "glass",
  className,
}: AiSuggestionPanelProps) {
  const enabled = useAiStore((s) => s.enabled);
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
  const [error, setError] = useState("");

  async function onGenerate() {
    setLoading(true);
    setError("");
    try {
      setSuggestion(await generate());
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setLoading(false);
    }
  }

  async function onCopy() {
    if (!suggestion) return;
    try {
      await navigator.clipboard.writeText(suggestion.text);
      toast.success(copy.toasts.copied);
    } catch {
      // Clipboard access can be denied; failing silently is acceptable here.
    }
  }

  return (
    <section
      aria-label={title}
      className={cn(
        surface === "glass"
          ? "glass-card rounded-lg border-dashed p-4"
          : "bg-subtle/60 rounded-lg border border-glass-border p-3 sm:p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Badge tone="accent" className="self-start">
            <Sparkles className="h-3 w-3" /> {copy.aiSuggestion.badge}
          </Badge>
          <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
          <p className="text-xs text-text-secondary">{description}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0 whitespace-nowrap"
          disabled={!enabled || loading}
          aria-disabled={!enabled || loading}
          title={enabled ? undefined : copy.aiSuggestion.disabledTitle}
          onClick={onGenerate}
        >
          {loading ? <Spinner /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? copy.aiSuggestion.generating : generateLabel}
        </Button>
      </div>

      {!enabled ? (
        <p className="mt-3 text-xs text-text-muted">{copy.aiSuggestion.disabledMessage}</p>
      ) : null}

      {error ? <p className="mt-3 text-xs font-medium text-danger">{error}</p> : null}

      {suggestion ? (
        <div className="mt-3 flex flex-col gap-2">
          <div className="whitespace-pre-wrap rounded-md border border-border-subtle bg-surface p-3 text-sm text-text-primary">
            {suggestion.text}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-text-muted">
              {copy.aiSuggestion.metadata(suggestion.model, suggestion.promptCharCount)}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={onCopy}>
              <Copy className="h-3.5 w-3.5" />
              {copy.common.copy}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function messageFor(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return copy.aiSuggestion.fallbackError;
}
