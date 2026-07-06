import { Sun, Moon, Monitor } from "lucide-react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { useThemeStore, type ThemeMode } from "@/store/themeStore";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";

const options: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: copy.theme.light, icon: Sun },
  { value: "dark", label: copy.theme.dark, icon: Moon },
  { value: "system", label: copy.theme.system, icon: Monitor },
];

export function ThemeToggle() {
  const { mode, setMode } = useThemeStore();
  return (
    <RadioGroup.Root
      value={mode}
      onValueChange={(v) => setMode(v as ThemeMode)}
      className="inline-grid max-w-full grid-cols-3 rounded-md border border-glass-border bg-glass-surface p-0.5"
      aria-label={copy.theme.ariaLabel}
    >
      {options.map(({ value, label, icon: Icon }) => (
        <RadioGroup.Item
          key={value}
          value={value}
          className={cn(
            "inline-flex h-7 min-w-0 items-center justify-center gap-1 rounded px-1.5 text-xs font-medium sm:gap-1.5 sm:px-2",
            "text-text-secondary transition-colors duration-micro ease-soft",
            "hover:text-text-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            "data-[state=checked]:bg-subtle data-[state=checked]:text-text-primary",
          )}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          {label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
