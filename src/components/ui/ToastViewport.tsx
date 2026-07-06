import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, XCircle, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { durations, easeSoft } from "@/lib/motion";
import { useToastStore, type ToastItem, type ToastTone } from "@/store/toastStore";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/cn";

const AUTO_DISMISS_MS = 4000;

const toneIcon: Record<ToastTone, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const toneClass: Record<ToastTone, string> = {
  success: "text-success",
  error: "text-danger",
  info: "text-accent",
};

/**
 * Fixed bottom-right stack. The wrapper is a permanent polite live region so
 * screen readers announce every insertion — transient status used to be
 * inline-only and invisible to assistive tech.
 */
export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((item) => (
          <Toast key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toast({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const timer = useRef<number | null>(null);

  // Auto-dismiss lives here so hover can pause it; the effect restarts the
  // countdown from scratch on resume, which is fine at this duration.
  useEffect(() => {
    start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  function start() {
    stop();
    timer.current = window.setTimeout(() => dismiss(item.id), AUTO_DISMISS_MS);
  }
  function stop() {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }

  const Icon = toneIcon[item.tone];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: durations.soft, ease: easeSoft }}
      onMouseEnter={stop}
      onMouseLeave={start}
      className="glass-overlay pointer-events-auto flex items-start gap-2.5 rounded-lg px-3.5 py-3"
    >
      <Icon aria-hidden="true" className={cn("mt-px h-4 w-4 shrink-0", toneClass[item.tone])} />
      <p className="flex-1 text-sm text-text-primary">{item.message}</p>
      <button
        onClick={() => dismiss(item.id)}
        aria-label={copy.common.close}
        className="rounded text-text-muted hover:text-text-primary"
      >
        <X aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}
