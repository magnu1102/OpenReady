import type { CommandShortcut } from "./types";

export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad/i.test(navigator.platform);
}

export function formatShortcut(shortcut: CommandShortcut): string {
  const parts: string[] = [];
  if (shortcut.meta) parts.push(isMacPlatform() ? "⌘" : "Ctrl");
  if (shortcut.shift) parts.push(isMacPlatform() ? "⇧" : "Shift");
  parts.push(shortcut.key === " " ? "Space" : shortcut.key.toUpperCase());
  return parts.join(isMacPlatform() ? "" : "+");
}

export function matchesShortcut(event: KeyboardEvent, shortcut: CommandShortcut): boolean {
  const metaPressed = event.metaKey || event.ctrlKey;
  if (Boolean(shortcut.meta) !== metaPressed) return false;
  if (Boolean(shortcut.shift) !== event.shiftKey) return false;
  return event.key.toLowerCase() === shortcut.key.toLowerCase();
}
