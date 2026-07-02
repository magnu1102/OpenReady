# Changelog

All notable changes to OpenReady are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). While the project is
pre-1.0, breaking changes can appear in any `0.x` bump and are called out in the
relevant section.

## [Unreleased]

_No changes yet._

## [0.2.0] — 2026-07-02

### Added

- CLI gating and plugins wired end to end: `openready analyze` now loads check
  packs (`--plugins` + `--allow-plugins`), runs custom checks per repository,
  includes their results as `customChecks` in the JSON export, applies
  `--profile` files (category weights multiply into scoring like the desktop
  Settings weights; `thresholds.failUnder` acts as the default score gate), and
  enforces the CI gate — `--fail-under` / `--require-check` violations print to
  stderr and exit with the new code `4`. Invalid profile or plugin inputs fail
  fast with exit `2` before any GitHub request.
- Plugin and ecosystem foundation (Phase 16): versioned JSON Schema documents
  for the JSON export, check packs, and profiles under `schemas/` (with an
  Ajv-backed conformance test), a check-plugins system (Node plugin loader,
  safe runner with id/output validation and evidence clipping, and an official
  reference pack), a small profiles module, and CLI gating for CI:
  `--fail-under`, `--require-check`, `--plugins`, `--profile`, and
  `--allow-plugins`, backed by a pure gating evaluator.
- Optional AI assist (Phase 15): opt-in, bring-your-own-key support for an
  OpenAI-compatible provider with README critique, project summaries, and
  CV/homepage wording refinement. Every AI-touched surface is badged, provider
  auth is explicit with a key board and verify action, keys persist in the OS
  credential store (native keyring backends), and real provider errors are
  surfaced. The deterministic core is unchanged and never requires a key.
- MIT `LICENSE` — OpenReady is now formally open source under the MIT License,
  with matching `license` fields in `package.json` and `src-tauri/Cargo.toml`.
- Open-source community files: `CONTRIBUTING.md` (setup, quality gates, PR flow,
  and an authorship/AI-attribution policy), `CODE_OF_CONDUCT.md`, `SECURITY.md`
  (private vulnerability reporting), and GitHub issue/PR templates under
  `.github/`.
- Package metadata (`description`, `author`, `repository`, `bugs`, `homepage`,
  `keywords`) and README badges, a Contributing section, and a Screenshots
  section.
- Portfolio mode (Phase 14): a new `/portfolio` route that auto-detects a target
  role from the repository mix (override-able), recommends which projects to
  feature (with pin/unpin), and generates a portfolio page, CV bullet points,
  and interview talking points — each exportable as Markdown. Fully
  deterministic and local; the CLI is unchanged.
- Advanced recommendations (Phase 13): recommendations are ranked by their
  projected score impact (shown as `+N pts`); a deterministic hidden-gem
  detector flags strong-but-under-promoted repositories on the dashboard;
  scoring weights are user-customizable per category from a new Settings card
  (multipliers layered on top of the project-type profile weights); and a
  `/dashboard/compare` view compares up to three repositories side by side.
- Release packaging (Phase 12): `CHANGELOG.md`, `scripts/bump-version.mjs`, a
  pull-request `lint-and-test` workflow, a tag-triggered release workflow that
  builds the Tauri desktop bundles on macOS, Windows, and Linux via
  `tauri-apps/tauri-action`, and the CLI esbuild bundle attached as an
  additional release asset.
- New docs: `docs/releasing.md` (release checklist), `docs/signing.md`
  (Gatekeeper / SmartScreen notes for unsigned artifacts), `docs/plugins.md`
  (check-pack and profile authoring guide), and `docs/json-schema.md` (the
  versioned data contracts).

### Changed

- The local analysis cache schema bumped to version 3 (`AnalysisResult` gained
  a required `hiddenGem` field); pre-Phase-13 snapshots are dropped on first
  read and repopulated on the next refresh.

### Fixed

- CLI: a leading `--` separator forwarded by package managers
  (`pnpm cli -- analyze …`) is now ignored, so the documented command no longer
  fails with "Unknown command: --" (#13).
- Styling cleanup: corrected the stale "Phase 8" label shown on the welcome
  screen and sidebar (now sourced from a single `APP_PHASE` constant); aligned
  the dashboard summary numbers so a wrapping label no longer drops one out of
  line; stopped badges from wrapping and clipping in narrow columns (e.g. the
  repository detail score breakdown); strengthened light-mode card separation;
  and collapsed the sidebar to its icon rail on narrow viewports so content no
  longer clips.

## 0.1.0 — Initial release

_Source-only milestone — never tagged, and no binaries were published. Its
content ships as part of v0.2.0._

Bundles the deterministic analyzer, the React desktop app shell, and the Node
CLI. Includes everything that landed in Phases 1–11.

### Added

- **Phase 1 — Desktop app skeleton.** Tauri 2 + React + TypeScript shell with
  Welcome, Dashboard, Repository detail, and Settings routes and a token-driven
  design system.
- **Phase 2 — GitHub public repository fetch.** Username entry, GitHub client,
  loading / error / rate-limit states.
- **Phase 3 — Basic deterministic checks.** README presence, description,
  topics, homepage / demo link, license, recent activity, archived and fork
  status.
- **Phase 4 — File and tech-stack detection.** Recursive Git tree fetch, with
  signal detection for Node, Python, Rust, Go, Java / Gradle, Android, Docker,
  GitHub Actions, Terraform, Kubernetes, docs/, and tests.
- **Phase 5 — Scoring engine v1.** Eight category scores, total score,
  evidence-backed labels, and the `Portfolio-ready` / `Almost ready` /
  `Needs work` / `Experimental` health tiers (plus the `Archived`, `Fork`,
  `Stale`, and `Analyzing` overrides).
- **Phase 6 — Repository detail view.** Per-category breakdowns, evidence
  drill-down, and prioritized recommendations.
- **Phase 7 — Export system v1.** Markdown reports, JSON summaries, and
  homepage-card Markdown exports.
- **Phase 8 — Local cache and settings.** Cached analysis snapshots, explicit
  refresh, optional GitHub token stored in the OS credential store, theme
  preference, cache management.
- **Phase 9 — Project classification.** Six core project types plus an
  `unknown` fallback, per-type category weights, type-specific extra checks,
  confidence indicators, and a manual override that survives across sessions.
  Cache schema bumped to v2.
- **Phase 10 — UI polish and onboarding.** Four-step guided tour anchored to
  real UI elements with replay from Settings, Cmd+K command palette and Cmd+/
  shortcut sheet powered by a shared command registry, targeted keyboard
  navigation, skip-to-content link, `prefers-reduced-motion` honoured across
  framer-motion entries and the `ScoreRing` count-up, and focus-trapped modal
  overlays.
- **Phase 11 — CLI version.** `openready analyze <username>` with
  `--format table|json|markdown`, `--limit`, `--repo`, `--out`, `--token`,
  `--no-readme`, `--no-tree`. Token resolution order: `--token` →
  `OPENREADY_GITHUB_TOKEN` → `GITHUB_TOKEN`. esbuild bundle at
  `dist-cli/openready.mjs`.

[Unreleased]: https://github.com/magnu1102/OpenReady/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/magnu1102/OpenReady/releases/tag/v0.2.0
