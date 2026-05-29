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
- **Phase 12 — Release packaging.** Cross-platform Tauri bundles via tauri-action, CLI bundle asset, CHANGELOG + bump-version script, signing notes. ← _current_
- **Phase 13 — Advanced recommendations.** Prioritization, hidden-gem detection, custom weights.
- **Phase 14 — Job-market and portfolio mode.** Role selection, portfolio export, CV/talking-points helpers.
- **Phase 15 — Optional AI assist.** Bring-your-own-key, README critique, summaries.
- **Phase 16 — Plugin and ecosystem.** Custom checks, GitHub Action, JSON schema.
