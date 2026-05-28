import { useCallback, useEffect, useMemo, useState } from "react";
import { useCommands } from "./useCommands";
import { CommandPalette } from "./CommandPalette";
import { ShortcutSheet } from "./ShortcutSheet";
import { matchesShortcut } from "./shortcuts";

/**
 * Single mounting point for the command palette + shortcut sheet. Owns the
 * "which surface is open" state and the global keydown listener that dispatches
 * registered shortcuts. Renders at the root so any route benefits.
 */
export function CommandsRoot() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const openShortcuts = useCallback(() => setShortcutsOpen(true), []);
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), []);

  const options = useMemo(
    () => ({ openPalette, closePalette, openShortcuts }),
    [openPalette, closePalette, openShortcuts],
  );

  const commands = useCommands(options);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      for (const command of commands) {
        if (!command.shortcut) continue;
        if (matchesShortcut(event, command.shortcut)) {
          event.preventDefault();
          void command.run();
          return;
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commands]);

  return (
    <>
      <CommandPalette open={paletteOpen} commands={commands} onClose={closePalette} />
      <ShortcutSheet open={shortcutsOpen} commands={commands} onClose={closeShortcuts} />
    </>
  );
}
