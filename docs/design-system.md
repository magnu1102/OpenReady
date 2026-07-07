# Aurora design system

Aurora is OpenReady's design language: layered translucent surfaces over a
faintly tinted canvas, a deep violet-blue accent, and choreographed but calm
motion. It executes master plan §14 — clean, calm, modern, trustworthy — with
glass and glow as the premium layer on top.

Everything routes through semantic CSS variables in
[`src/styles/tokens.css`](../src/styles/tokens.css), mapped into Tailwind by
[`tailwind.config.ts`](../tailwind.config.ts). Components never hardcode
colors, durations, or blur values.

## Surfaces

Three glass utility classes in `globals.css` (`@layer components`):

| Class            | Fill                     | Blur     | Use for                                                            |
| ---------------- | ------------------------ | -------- | ------------------------------------------------------------------ |
| `.glass-panel`   | `--glass-surface`        | 14px     | Static shell surfaces: sidebar rail, topbar, tour panel            |
| `.glass-overlay` | `--glass-surface-strong` | 22px     | Floating layers: command palette, shortcut sheet, tooltips, toasts |
| `.glass-card`    | `--glass-surface`        | **none** | Content cards (`Card` applies it internally)                       |

Rules:

- **Blur only on static shell surfaces and overlays.** Cards use `.glass-card`
  (no `backdrop-filter`) so a dashboard grid never blurs per frame — that is
  the classic WebView2 jank source.
- **No nested glass.** A panel inside a glass surface uses solid `bg-subtle`.
  Two stacked translucencies compound into unpredictable contrast.
- **Never animate `backdrop-filter` or `box-shadow` per frame.** Motion
  animates `transform` and `opacity` only; glow changes ride `transition` on
  hover state, not keyframes.
- When `backdrop-filter` is unsupported, an `@supports` block in `tokens.css`
  collapses the glass fills to solid surfaces. Toggling that block is also the
  manual kill-switch if profiling ever shows blur jank.

## Color and contrast

The app never renders user imagery, so the backdrop under glass is always the
tinted canvas. Contrast is therefore verified against the **composited** color
(glass fill alpha-blended over `--bg-canvas`):

- Light: `rgba(255,255,255,0.65)` over `#f7f7fb` ≈ **#fafafc**
- Dark: `rgba(21,21,30,0.60)` over `#0d0d14` ≈ **#12121b**

Computed ratios on those composites (WCAG AA needs 4.5:1 normal / 3:1 large):

| Pair                        | Light    | Dark     |
| --------------------------- | -------- | -------- |
| `--text-primary` on glass   | ≈ 16.9:1 | ≈ 16.2:1 |
| `--text-secondary` on glass | ≈ 7.6:1  | ≈ 8.3:1  |
| `--accent` on glass         | ≈ 6.8:1  | ≈ 7.4:1  |

Rules:

- Glass fill opacity never drops below **0.65 light / 0.60 dark** — the table
  above assumes those floors.
- `--text-muted` is for non-essential text only (hints, captions), never for
  information a user must read.
- `--success`/`--warn`/`--danger` are **data colors** — score tiers and status
  badges only. The brand accent never encodes a score.

Score tiers mirror `chooseHealthLabel` in analyzer-core: ≥85 success, ≥70
accent, ≥50 warn, below danger. `scoreTier()` in
[`src/lib/scoreTier.ts`](../src/lib/scoreTier.ts) is the single source
(ScoreRing and ScoreBar both import it).

## Typography

Inter at a 14px body base (data-dense tool; premium comes from refinement, not
size): weights 400/500/600/700, tighter tracking on headings, JetBrains Mono
for code, `tabular-nums` for every score so digits don't jitter during
count-ups.

## Motion

All framer-motion choreography imports from
[`src/lib/motion.ts`](../src/lib/motion.ts); its durations (150/220/320ms) and
easing mirror the CSS transition tokens so both systems stay in step.

- **Tour rule (load-bearing):** elements carrying `data-tour-anchor` and their
  ancestors animate with `fadeIn` (opacity only) — never transforms.
  `TourOverlay` positions its dimmer from `getBoundingClientRect()`, which
  includes in-flight transforms.
- **Entrance-only transitions.** No `AnimatePresence` exit animations on
  routes or tabs: exits double-mount content and break focus traps and the
  skip-link target.
- **Stagger budget:** total choreography for a view stays under ~600ms.
- **Reduced motion** is honored three ways: `<MotionConfig reducedMotion="user">`
  in the shell, the CSS guard in `globals.css`, and `useReducedMotion()` for
  imperative animations (count-ups, ring draws).

## Copy

Every user-facing string lives in [`src/lib/copy.ts`](../src/lib/copy.ts) and
follows [voice-and-tone.md](./voice-and-tone.md). Tests assert against the
same constants. Toasts announce **events**; persistent state stays inline.
