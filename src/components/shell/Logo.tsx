import { cn } from "@/lib/cn";

/**
 * The OpenReady mark: a readiness dial stopped at 85% — the portfolio-ready
 * threshold. Master asset lives at public/brand/openready-mark.svg; keep the
 * geometry in sync (ratios: ring r = 0.293·size, stroke = 0.086·size).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("inline-flex items-center justify-center", className)} aria-hidden>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <defs>
          <linearGradient id="logo-gradient" x1="0" y1="0" x2="28" y2="28">
            <stop offset="0%" stopColor="var(--gradient-accent-from)" />
            <stop offset="100%" stopColor="var(--gradient-accent-to)" />
          </linearGradient>
        </defs>
        <rect width="28" height="28" rx="6.3" fill="url(#logo-gradient)" />
        <circle cx="14" cy="14" r="8.2" stroke="white" strokeOpacity="0.28" strokeWidth="2.4" />
        {/* 85% arc: circumference 2π·8.2 ≈ 51.5, dash 43.8 gap 7.7, from 12 o'clock */}
        <circle
          cx="14"
          cy="14"
          r="8.2"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray="43.8 7.7"
          transform="rotate(-90 14 14)"
        />
        <circle cx="14" cy="14" r="1.75" fill="white" />
      </svg>
    </div>
  );
}
