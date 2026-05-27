import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-subtle via-border-subtle to-subtle bg-[length:200%_100%]",
        className,
      )}
      style={{ animationDuration: "1.6s" }}
      {...props}
    />
  );
}
