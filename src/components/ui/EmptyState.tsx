import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border-default",
        "bg-surface/50 px-8 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-subtle">
          <Icon className="h-5 w-5 text-text-muted" strokeWidth={1.75} />
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
