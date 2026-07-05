# Roadmap

A condensed phase outline. The master plan (`openready_master_plan.md` §13) is the source of truth.

- **Phase 0 — Foundation.** Master plan, principles, contribution policy. ✅
- **Phase 1 — Desktop app skeleton.** Tauri + React + TS shell, navigation, four placeholder screens, design system, docs skeleton. ✅
- **Phase 2 — GitHub public repository fetch.** Username input wired up, GitHub client, public repo list, loading/error/rate-limit states. ✅
- **Phase 3 — Basic deterministic checks.** README, license, description, topics, homepage, recent activity, archived/fork status. ✅
- **Phase 4 — File and tech-stack detection.** Package manifests, Docker, CI workflows, mobile/Gradle, IaC, docs, tests. ✅
- **Phase 5 — Scoring engine v1.** Category scores, total score, evidence list, labels. ✅
- **Phase 6 — Repository detail view.** Full per-repo breakdowns and recommendations. ✅
- **Phase 7 — Export system v1.** Markdown, JSON and homepage cards. ✅
- **Phase 8 — Local cache and settings.** Refresh, optional token storage, theme, preferences. ✅
- **Phase 9 — Project classification.** Type-specific expectations, weighted scoring, manual overrides. ✅
- **Phase 10 — UI polish and onboarding.** Guided tour, command palette, keyboard navigation, reduced-motion + accessibility pass. ✅
- **Phase 11 — CLI version.** `openready analyze <username>` with table/JSON/Markdown output, token chain, esbuild bundle. ✅
- **Phase 12 — Release packaging.** Cross-platform Tauri bundles via tauri-action, CLI bundle asset, CHANGELOG + bump-version script, signing notes. ✅
- **Phase 13 — Advanced recommendations.** Score-impact prioritization, hidden-gem detection, user-customizable category weights, repository comparison. ✅
- **Phase 14 — Job-market and portfolio mode.** Auto-suggested role selection, recommended featuring, portfolio/CV/talking-points exports. ✅
- **Phase 15 — Optional AI assist.** Bring-your-own-key, OpenAI-compatible provider, README critique, project summaries, CV/homepage wording refinement. Opt-in, badged, never replaces the deterministic core. ✅
- **Phase 16 — Plugin and ecosystem.** Versioned JSON Schemas with conformance tests, check-plugins system (loader, safe runner, official pack), profiles, CLI gating flags (`--fail-under`, `--require-check`, `--plugins`, `--profile`, `--allow-plugins`). ✅
- **Phase 17 — Ship v0.1.0 for real.** Screenshots, version alignment, local build verification, annotated tag, first run of the release workflow. Shipped as [v0.2.0](https://github.com/magnu1102/OpenReady/releases/tag/v0.2.0), which absorbed the untagged 0.1.0 milestone. ✅
- **Phase 18 — CI gate and GitHub Action.** Composite action wrapping the CLI gating, score badges from the JSON export, example workflows. ← _current_
- **Phase 19 — Distribution hardening.** npm packaging of the CLI, updater groundwork, signing/notarization checklist, Rust checks in CI, e2e smoke test.
- **Phase 20 — GitHub client efficiency and org support.** ETag conditional requests, request-budget indicator, optional GraphQL path, organization analysis, changed-repo-only refresh.
- **Phase 21 — History and trends.** Bounded snapshot history, score deltas since last analysis, trend views, progress-report export.
- **Phase 22 — Local AI providers.** Ollama via the OpenAI-compatible adapter, provider presets, local-model badge, graceful degradation for small models.
