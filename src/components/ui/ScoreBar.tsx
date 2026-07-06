import { scoreTier, type ScoreTier } from "@/lib/scoreTier";

const tierClass: Record<ScoreTier, string> = {
  success: "bg-success",
  accent: "bg-accent-gradient",
  warn: "bg-warn",
  danger: "bg-danger",
  none: "",
};

/** A thin horizontal bar visualizing a 0–100 score, or an empty track when null. */
export function ScoreBar({ score }: { score: number | null }) {
  if (score === null) {
    return <div className="h-1.5 w-full rounded-full bg-border-subtle" aria-hidden />;
  }
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-subtle" aria-hidden>
      <div
        className={`h-full rounded-full transition-[width] duration-soft ease-soft ${tierClass[scoreTier(score)]}`}
        style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
      />
    </div>
  );
}
