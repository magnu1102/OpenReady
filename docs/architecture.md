# Architecture

RepoPulse is a Tauri desktop application. The frontend is React + TypeScript; the shell is Rust via Tauri.

## Current shape (Phase 1)

```
RepoPulse desktop
  ├── React/TypeScript UI (Vite)
  │   ├── routes/        — Welcome, Dashboard, RepositoryDetail, Settings
  │   ├── components/    — shell + UI primitives (Radix-backed)
  │   ├── store/         — Zustand slices (theme, navigation)
  │   ├── modules/       — internal package boundaries (analyzer-core, github-client, scoring-engine, export-engine, ai-adapter)
  │   └── styles/        — design tokens + globals
  └── Tauri Rust shell (src-tauri/)
```

The `src/modules/*` folders define the public surface of each future package. They are intentionally empty in Phase 1; later phases fill them in. When the project grows beyond a single app, they can be lifted into a `packages/*` workspace without rewriting their consumers.

## Long-term direction

See `repopulse_master_plan.md` §12 for the mature architecture (apps + packages workspace).
