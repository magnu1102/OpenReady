# Onboarding and keyboard

Phase 10 polished the desktop surface around three pillars: a guided product tour, a command palette + shortcut sheet, and a reduced-motion / accessibility pass. This page is the reference for all three.

## Guided tour

A four-step walkthrough that auto-starts the first time a user lands on the Dashboard with repositories loaded, and is replayable from Settings.

| Step | Anchor                 | Route        | What it teaches                               |
| ---- | ---------------------- | ------------ | --------------------------------------------- |
| 1    | `welcome-cta`          | `/`          | Start with a GitHub account                   |
| 2    | `dashboard-first-card` | `/dashboard` | Health label, type chip, score on each card   |
| 3    | `export-panel`         | `/dashboard` | Local Markdown / JSON / homepage-card exports |
| 4    | `settings-replay`      | `/settings`  | Replay the tour, GitHub token, cache controls |

### Behaviour

- Anchored via `data-tour-anchor="<id>"` attributes on target elements. The overlay computes the rect with `getBoundingClientRect`, observes resize/scroll, and retries once after 80 ms to handle elements that mount a tick late.
- Step 0's route is the Welcome screen, but the auto-start hook in `AppShell` picks the first step whose `route` matches the current pathname, so users analysing for the first time start at step 2 (the dashboard) instead of being bounced back to Welcome.
- Persists a `seen` flag in `localStorage` (or the Tauri store) so the overlay never re-triggers without an explicit replay from Settings.
- `Escape` skips the tour. The popover is focus-trapped while open.

### Files

- `src/modules/tour/tourStore.ts` — zustand store (`start`, `startAt`, `next`, `prev`, `skip`, `restart`, `setStep`)
- `src/modules/tour/TourOverlay.tsx` — portaled overlay with clip-path dimmer and viewport-clamped popover
- `src/modules/tour/tourSteps.ts` — the four-step list above

## Command palette and shortcut sheet

A central command registry powers both surfaces. Each command has `id`, `label`, `hint?`, `group`, optional `shortcut`, and a `run` callback. The list combines static commands (Navigate, View, Action) with dynamic per-cached-repo "Open repo: …" entries.

### Shortcuts shipped

| Shortcut              | Command                                                              |
| --------------------- | -------------------------------------------------------------------- |
| ⌘K / Ctrl+K           | Open command palette                                                 |
| ⌘/ / Ctrl+/           | Show keyboard shortcut sheet                                         |
| ⌘B / Ctrl+B           | Toggle the sidebar                                                   |
| ⌘, / Ctrl+,           | Open Settings                                                        |
| `/`                   | Focus the account field on Welcome (no modifier)                     |
| `↑` / `↓` / `←` / `→` | Move focus between dashboard cards (Home / End jump to first / last) |
| `Esc`                 | Close palette, shortcut sheet, or tour                               |

### Behaviour

- The palette runs a fuzzy AND-match over each command's `label + hint` (whitespace-separated tokens).
- Arrow keys move the active selection; Enter runs it; the active row is scrolled into view.
- A single global keydown listener in `CommandsRoot` dispatches all registered shortcuts so individual routes never wire their own listeners.
- Palette and shortcut sheet are both focus-trapped via `useFocusTrap`; on close they return focus to the previously active element.

### Files

- `src/modules/commands/CommandsRoot.tsx` — single mount point, owns the open/closed state and the keydown dispatcher
- `src/modules/commands/useCommands.ts` — registry hook + `filterCommands`
- `src/modules/commands/CommandPalette.tsx` — palette dialog
- `src/modules/commands/ShortcutSheet.tsx` — registered-shortcut reference dialog
- `src/modules/commands/shortcuts.ts` — `formatShortcut`, `matchesShortcut`, platform detection

## Motion and accessibility

- `src/lib/useReducedMotion.ts` watches `prefers-reduced-motion`; framer-motion enters on Welcome and Dashboard collapse to the final state when reduced motion is requested.
- `src/lib/useCountUp.ts` drives the `ScoreRing` from 0 to the target value over ~600 ms with a cubic ease-out, and snaps instantly under reduced motion.
- A global CSS guard in `src/styles/globals.css` flattens animation and transition durations under `prefers-reduced-motion` for anything that bypassed the hook.
- A skip-to-main-content link is the first focusable element on every page and routes focus to `<main id="main">`.
- The active sidebar route renders with `aria-current="page"` via `react-router`'s `NavLink`; decorative icons are `aria-hidden="true"`; collapsed nav labels stay `sr-only` for screen readers.
- All modal overlays (palette, shortcut sheet, tour popover) trap Tab/Shift+Tab via `src/lib/useFocusTrap.ts` and restore focus on close.
