import { useId } from "react";
import { cn } from "@/lib/cn";
import { useCountUp } from "@/lib/useCountUp";
import { scoreTier, scoreTierVar } from "@/lib/scoreTier";

interface ScoreRingProps {
  value?: number | null;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
}

export function ScoreRing({
  value = null,
  size = 120,
  strokeWidth = 8,
  className,
  label = "Score",
}: ScoreRingProps) {
  const gradientId = useId();
  const animated = useCountUp(value);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const liveValue = animated ?? value;
  const safe = liveValue === null ? 0 : Math.max(0, Math.min(100, liveValue));
  const offset = circumference * (1 - safe / 100);
  const displayValue = liveValue === null ? "—" : String(Math.round(safe));

  // Tier comes from the final value, not the animating one, so the ring
  // doesn't flash through lower tiers during the count-up.
  const tier = scoreTier(value);
  const stroke = scoreTierVar[tier];
  // High tiers earn a soft glow; warn/danger stay matter-of-fact.
  const glow =
    tier === "success" || tier === "accent"
      ? { filter: `drop-shadow(0 0 ${Math.max(4, size * 0.05)}px ${stroke})`, opacity: 0.9 }
      : undefined;

  // Typography scales with the ring so small instances (e.g. 56px portfolio cards)
  // don't clip the number and label against the stroke.
  const valueFontSize = Math.max(11, Math.min(28, Math.round(size * 0.32)));
  const labelFontSize = Math.max(8, Math.min(12, Math.round(size * 0.1)));
  const showLabel = size >= 72;

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${displayValue}`}
    >
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={stroke} stopOpacity="1" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={strokeWidth}
        />
        {value !== null ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={glow}
            className="transition-[stroke-dashoffset] duration-soft ease-soft"
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span
          className="font-semibold tabular-nums text-text-primary"
          style={{ fontSize: valueFontSize, lineHeight: 1 }}
        >
          {displayValue}
        </span>
        {showLabel ? (
          <span
            className="mt-0.5 text-text-muted"
            style={{ fontSize: labelFontSize, lineHeight: 1 }}
          >
            {label}
          </span>
        ) : (
          <span className="sr-only">{label}</span>
        )}
      </div>
    </div>
  );
}
