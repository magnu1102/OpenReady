import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "bg-subtle/60 h-9 w-full rounded-md border border-glass-border px-3 text-sm",
        "text-text-primary placeholder:text-text-muted",
        "transition-[border-color,box-shadow] duration-micro ease-soft",
        "hover:border-border-default",
        "focus:ring-accent/30 focus:border-accent focus:shadow-glow focus:outline-none focus:ring-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
