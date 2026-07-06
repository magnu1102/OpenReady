# Architecture

OpenReady is a Tauri desktop application backed by a deterministic TypeScript analyzer. The same analyzer also powers a Node CLI — both surfaces share the modules under `src/modules/`, so a change to scoring or classification immediately reaches both.

## Current shape (Phase 11)

```
OpenReady
  ├── React/TypeScript UI (Vite)             — src/
  │   ├── routes/                            — Welcome, Dashboard, RepositoryDetail, Settings
  │   ├── components/{shell,ui}/             — app shell + Radix-backed primitives
  │   ├── store/                             — Zustand slices (theme, navigation, repository, tour)
  │   ├── modules/                           — internal package boundaries (see below)
  │   ├── lib/                               — small hooks/utilities (useCountUp, useReducedMotion, useFocusTrap, …)
  │   │                                        plus copy.ts (every user-facing string; see docs/voice-and-tone.md)
  │   │                                        and motion.ts (shared framer-motion choreography; see docs/design-system.md)
  │   └── styles/                            — Aurora design tokens + glass utilities (docs/design-system.md)
  ├── Node CLI                                — src/cli/
  │   ├── index.ts                           — entry, help/version, dispatch
  │   ├── args.ts                            — node:util parseArgs wrapper
  │   ├── auth.ts                            — token chain (flag → OPENREADY_GITHUB_TOKEN → GITHUB_TOKEN)
  │   ├── run.ts                             — orchestrates analyzer + emits output
  │   └── renderers/{table,color}.ts         — terminal table + ANSI helper
  ├── Tauri Rust shell                        — src-tauri/
  └── Build outputs                           — dist/ (web), dist-cli/ (CLI)
```

### Shared modules

Every module under `src/modules/` is framework-free: no DOM, no React. The CLI (`src/cli/`) and the React store (`src/store/repositoryStore.ts`) both depend on this surface, which is why phase 9–11 work compounds — adding the project classifier benefits the CLI for free, and the CLI's token hook is reusable from any Node consumer.

| Module                  | Responsibility                                                                                                                                                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `github-client`         | Fetches the public repository list, READMEs, and file trees. Gates a Tauri proxy path behind `typeof window !== "undefined"` and exposes `setGitHubAuthToken` for non-Tauri runtimes (CLI).                                      |
| `analyzer-core`         | Pure deterministic checks (metadata, README sections, build/CI/tests/infra/security signals). Returns `AnalysisResult` per repository.                                                                                           |
| `project-classifier`    | Phase 9. Classifies a repo into one of six core types (frontend, backend, full-stack, desktop, cli, library) + `unknown`, with confidence and reasons. Owns per-type `ClassificationProfile`s (category weights + extra checks). |
| `scoring-engine`        | Aggregates checks into eight category scores and a weighted total. `CategoryScore.weight` is surfaced for transparency.                                                                                                          |
| `recommendation-engine` | Maps failed checks to prioritized, human-readable recommendations.                                                                                                                                                               |
| `export-engine`         | Renders `AnalysisResult[]` as Markdown reports, JSON summaries, or homepage-card Markdown. Reused by both desktop exports and CLI `--format`.                                                                                    |
| `tour` (UI-only)        | Phase 10. Persisted store, anchored portal overlay, four-step product walkthrough.                                                                                                                                               |
| `commands` (UI-only)    | Phase 10. Command registry, Cmd+K palette, Cmd+/ shortcut sheet, global keydown dispatcher.                                                                                                                                      |
| `ai-adapter`            | Placeholder for Phase 15 opt-in AI features.                                                                                                                                                                                     |

The dashboard summarizes the profile and exposes exports; the repository detail route presents the per-repository breakdown including the type chip and weighted category scores. Settings owns theme, GitHub token, cache management, and tour replay.

### Cache & persistence

`src/lib/analysisCache.ts` snapshots `AnalysisResult[]` (with classification + override) to either the Tauri store or `localStorage`, depending on runtime. Schema version is bumped whenever the on-disk shape changes (currently v2 after Phase 9).

## Long-term direction

See `openready_master_plan.md` §12 for the mature architecture (apps + packages workspace). The current `src/modules/*` layout is already aligned with that direction — when the project grows beyond a single app, each module lifts into its own `packages/*` package without rewriting consumers.
