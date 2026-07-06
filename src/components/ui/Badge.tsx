import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "success" | "warn" | "danger";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const tones: Record<Tone, string> = {
  neutral: "bg-subtle text-text-secondary border-border-subtle",
  accent: "bg-accent-subtle text-accent border-accent/20",
  success: "bg-success/10 text-success border-success/20",
  warn: "bg-warn/10 text-warn border-warn/20",
  danger: "bg-danger/10 text-danger border-danger/20",
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 max-w-full items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-full border px-2 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
