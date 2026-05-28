# Architecture

OpenReady is a Tauri desktop application. The frontend is React + TypeScript; the shell is Rust via Tauri.

## Current shape (Phase 6)

```
OpenReady desktop
  ├── React/TypeScript UI (Vite)
  │   ├── routes/        — Welcome, Dashboard, RepositoryDetail, Settings
  │   ├── components/    — shell + UI primitives (Radix-backed)
  │   ├── store/         — Zustand slices (theme, navigation, repository fetch + analysis state)
  │   ├── modules/       — internal package boundaries (analyzer-core, github-client, scoring-engine, export-engine, ai-adapter)
  │   └── styles/        — design tokens + globals
  └── Tauri Rust shell (src-tauri/)
```

The `github-client` module fetches public repository metadata, README content and repository file trees for a GitHub user. The `analyzer-core` module runs pure deterministic checks over that data and returns transparent check results, scores, labels and prioritized recommendations. The dashboard summarizes the profile, and the repository detail route presents the per-repository breakdown. The other `src/modules/*` folders define the public surface of future packages. When the project grows beyond a single app, they can be lifted into a `packages/*` workspace without rewriting their consumers.

## Long-term direction

See `openready_master_plan.md` §12 for the mature architecture (apps + packages workspace).
