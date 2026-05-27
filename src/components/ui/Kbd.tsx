import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border-subtle bg-subtle px-1.5",
        "font-mono text-[11px] font-medium text-text-secondary",
        className,
      )}
      {...props}
    />
  );
}
