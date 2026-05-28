import { cn } from "@/lib/cn";
import { useCountUp } from "@/lib/useCountUp";

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
  const animated = useCountUp(value);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const liveValue = animated ?? value;
  const safe = liveValue === null ? 0 : Math.max(0, Math.min(100, liveValue));
  const offset = circumference * (1 - safe / 100);
  const displayValue = liveValue === null ? "—" : String(Math.round(safe));

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${displayValue}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-soft ease-soft"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums text-text-primary">
          {displayValue}
        </span>
        <span className="text-xs text-text-muted">{label}</span>
      </div>
    </div>
  );
}
