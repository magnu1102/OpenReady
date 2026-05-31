import { useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useAiStore } from "@/store/aiStore";
import type { AiSuggestion } from "@/modules/ai-adapter";
import { cn } from "@/lib/cn";

interface AiSuggestionPanelProps {
  /** Short title describing what this panel produces, e.g. "README critique". */
  title: string;
  /** One line telling the user what will be sent to their provider. */
  description: string;
  /** Runs the AI request. Throws on failure with a user-friendly message. */
  generate: () => Promise<AiSuggestion>;
  generateLabel?: string;
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
  generateLabel = "Generate",
  className,
}: AiSuggestionPanelProps) {
  const enabled = useAiStore((s) => s.enabled);
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

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
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied; failing silently is acceptable here.
    }
  }

  return (
    <section
      aria-label={title}
      className={cn(
        "border-accent/40 bg-accent-subtle/30 rounded-lg border border-dashed p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Badge tone="accent" className="self-start">
            <Sparkles className="h-3 w-3" /> AI suggestion (beta)
          </Badge>
          <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
          <p className="text-xs text-text-secondary">{description}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!enabled || loading}
          aria-disabled={!enabled || loading}
          title={enabled ? undefined : "Enable AI features in Settings"}
          onClick={onGenerate}
        >
          {loading ? <Spinner /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? "Generating" : generateLabel}
        </Button>
      </div>

      {!enabled ? (
        <p className="mt-3 text-xs text-text-muted">
          Turn on AI features in Settings to use this. OpenReady stays fully usable without it.
        </p>
      ) : null}

      {error ? <p className="mt-3 text-xs font-medium text-danger">{error}</p> : null}

      {suggestion ? (
        <div className="mt-3 flex flex-col gap-2">
          <div className="whitespace-pre-wrap rounded-md border border-border-subtle bg-surface p-3 text-sm text-text-primary">
            {suggestion.text}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-text-muted">
              {suggestion.model} · {suggestion.promptCharCount} characters sent
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={onCopy}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
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
  return "OpenReady could not generate an AI suggestion.";
}
