# Changelog

All notable changes to OpenReady are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). While the project is
pre-1.0, breaking changes can appear in any `0.x` bump and are called out in the
relevant section.

## [Unreleased]

### Added

- Release packaging (Phase 12): `CHANGELOG.md`, `scripts/bump-version.mjs`, a
  pull-request `lint-and-test` workflow, a tag-triggered release workflow that
  builds the Tauri desktop bundles on macOS, Windows, and Linux via
  `tauri-apps/tauri-action`, and the CLI esbuild bundle attached as an
  additional release asset.
- New docs: `docs/releasing.md` (release checklist) and `docs/signing.md`
  (Gatekeeper / SmartScreen notes for unsigned artifacts).

## [0.1.0] — Initial release

Bundles the deterministic analyzer, the React desktop app shell, and the Node
CLI as the first tagged artifact. Includes everything that landed in Phases
1–11.

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

[Unreleased]: https://github.com/magnu1102/OpenReady/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/magnu1102/OpenReady/releases/tag/v0.1.0
