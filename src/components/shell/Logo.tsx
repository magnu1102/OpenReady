import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("inline-flex items-center justify-center", className)} aria-hidden>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="7" fill="var(--accent)" />
        <path
          d="M6 14.5 L10 14.5 L12 9 L16 19 L18 13.5 L22 13.5"
          stroke="white"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}
