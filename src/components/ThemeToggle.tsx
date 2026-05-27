import { Sun, Moon, Monitor } from "lucide-react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { useThemeStore, type ThemeMode } from "@/store/themeStore";
import { cn } from "@/lib/cn";

const options: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle() {
  const { mode, setMode } = useThemeStore();
  return (
    <RadioGroup.Root
      value={mode}
      onValueChange={(v) => setMode(v as ThemeMode)}
      className="inline-flex rounded-md border border-border-default bg-surface p-0.5"
      aria-label="Theme"
    >
      {options.map(({ value, label, icon: Icon }) => (
        <RadioGroup.Item
          key={value}
          value={value}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium",
            "text-text-secondary transition-colors duration-micro ease-soft",
            "hover:text-text-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            "data-[state=checked]:bg-subtle data-[state=checked]:text-text-primary",
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
          {label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
