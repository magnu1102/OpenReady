import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Kbd } from "@/components/ui/Kbd";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { copy } from "@/lib/copy";
import type { Command } from "./types";
import { COMMAND_GROUP_LABELS } from "./types";
import { formatShortcut } from "./shortcuts";

export interface ShortcutSheetProps {
  open: boolean;
  commands: Command[];
  onClose: () => void;
}

export function ShortcutSheet({ open, commands, onClose }: ShortcutSheetProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (!open) {
      previouslyFocused.current?.focus?.();
      return;
    }
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Command[]>();
    for (const command of commands) {
      if (!command.shortcut) continue;
      const label = COMMAND_GROUP_LABELS[command.group];
      const list = groups.get(label) ?? [];
      list.push(command);
      groups.set(label, list);
    }
    return [...groups.entries()];
  }, [commands]);

  if (!open) return null;

  return createPortal(
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- modal dialog needs outside-click handler
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-sheet-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-md rounded-lg border border-border-default bg-surface p-5 shadow-xl focus-visible:outline-none"
      >
        <div className="flex items-center justify-between gap-2 pb-3">
          <h2 id="shortcut-sheet-title" className="text-md font-semibold text-text-primary">
            {copy.commands.shortcuts.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-text-muted hover:text-text-primary"
          >
            {copy.common.close}
          </button>
        </div>
        {grouped.length === 0 ? (
          <p className="text-sm text-text-muted">{copy.commands.shortcuts.empty}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {grouped.map(([label, items]) => (
              <section key={label} className="flex flex-col gap-2">
                <h3 className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  {label}
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {items.map((command) => (
                    <li
                      key={command.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="text-text-secondary">{command.label}</span>
                      {command.shortcut ? <Kbd>{formatShortcut(command.shortcut)}</Kbd> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
