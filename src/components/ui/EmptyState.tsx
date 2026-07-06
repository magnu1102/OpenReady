import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon?: LucideIcon;
  /** Aurora spot illustration; takes precedence over `icon` when provided. */
  illustration?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "glass-card flex flex-col items-center justify-center rounded-xl",
        "px-8 py-12 text-center",
        className,
      )}
    >
      {illustration ? (
        <div className="mb-4">{illustration}</div>
      ) : Icon ? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-subtle shadow-glow">
          <Icon className="h-6 w-6 text-accent" strokeWidth={1.5} />
        </div>
      ) : null}
      <h3 className="text-md font-semibold text-text-primary">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-md text-sm text-text-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
