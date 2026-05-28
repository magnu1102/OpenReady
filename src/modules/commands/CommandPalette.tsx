import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { Kbd } from "@/components/ui/Kbd";
import type { Command } from "./types";
import { COMMAND_GROUP_LABELS } from "./types";
import { filterCommands } from "./useCommands";
import { formatShortcut } from "./shortcuts";

export interface CommandPaletteProps {
  open: boolean;
  commands: Command[];
  onClose: () => void;
}

export function CommandPalette({ open, commands, onClose }: CommandPaletteProps) {
  if (!open) return null;
  return <PaletteContents commands={commands} onClose={onClose} />;
}

function PaletteContents({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [rawActiveIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const filtered = useMemo(() => filterCommands(commands, query), [commands, query]);
  // Derive the bounded index so we never need an effect to clamp state.
  const activeIndex = Math.min(rawActiveIndex, Math.max(0, filtered.length - 1));

  // Capture the previously focused element on mount and restore on unmount.
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(id);
      previouslyFocused.current?.focus?.();
    };
  }, []);

  // Scroll the active item into view.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.querySelector<HTMLLIElement>(`[data-command-index="${activeIndex}"]`);
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const grouped = groupCommands(filtered);

  function runCommand(command: Command) {
    onClose();
    // Defer to next tick so consumers' setState calls don't race with the palette unmount.
    window.setTimeout(() => {
      void command.run();
    }, 0);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(filtered.length - 1, index + 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const command = filtered[activeIndex];
      if (command) runCommand(command);
    }
  }

  return createPortal(
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- modal dialog needs keyboard + outside-click handlers
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-black/40 p-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={onKeyDown}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-lg border border-border-default bg-surface shadow-xl">
        <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-2.5">
          <Search className="h-4 w-4 text-text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setActiveIndex(0);
            }}
            placeholder="Type a command, navigate, or open a repo..."
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            aria-label="Filter commands"
            autoComplete="off"
            spellCheck={false}
          />
          <Kbd>Esc</Kbd>
        </div>
        <ul
          ref={listRef}
          className="scrollbar-thin max-h-[50vh] overflow-y-auto py-1"
          role="listbox"
          aria-label="Commands"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-text-muted">No matching commands.</li>
          ) : null}
          {grouped.map(({ label, items }) => (
            <li key={label}>
              <div className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-text-muted">
                {label}
              </div>
              <ul>
                {items.map(({ command, index }) => (
                  <li
                    key={command.id}
                    data-command-index={index}
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      runCommand(command);
                    }}
                    className={[
                      "flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm",
                      index === activeIndex
                        ? "bg-subtle text-text-primary"
                        : "hover:bg-subtle/60 text-text-secondary",
                    ].join(" ")}
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-text-primary">{command.label}</span>
                      {command.hint ? (
                        <span className="truncate text-xs text-text-muted">{command.hint}</span>
                      ) : null}
                    </div>
                    {command.shortcut ? (
                      <span className="shrink-0 text-xs text-text-muted">
                        {formatShortcut(command.shortcut)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-2 border-t border-border-subtle px-3 py-2 text-[11px] text-text-muted">
          <span className="flex items-center gap-2">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            to move
            <span className="ml-2 inline-flex items-center gap-1">
              <Kbd>↵</Kbd> to run
            </span>
          </span>
          <span>{filtered.length} commands</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface CommandGroupItems {
  label: string;
  items: { command: Command; index: number }[];
}

function groupCommands(commands: Command[]): CommandGroupItems[] {
  const groups = new Map<string, { command: Command; index: number }[]>();
  commands.forEach((command, index) => {
    const label = COMMAND_GROUP_LABELS[command.group];
    const list = groups.get(label) ?? [];
    list.push({ command, index });
    groups.set(label, list);
  });
  return [...groups.entries()].map(([label, items]) => ({ label, items }));
}
