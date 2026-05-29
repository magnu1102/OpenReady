/** A thin horizontal bar visualizing a 0–100 score, or an empty track when null. */
export function ScoreBar({ score }: { score: number | null }) {
  if (score === null) {
    return <div className="h-1.5 w-full rounded-full bg-border-subtle" aria-hidden />;
  }
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-subtle" aria-hidden>
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-soft ease-soft"
        style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
      />
    </div>
  );
}
