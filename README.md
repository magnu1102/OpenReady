# RepoPulse

RepoPulse is an open-source desktop app that analyzes GitHub repositories and helps developers understand which projects are clear, healthy and ready to share. It checks public repositories for documentation, setup instructions, licensing, CI, technology signals, presentation quality and other practical indicators, then turns the findings into transparent scores and actionable improvement suggestions.

RepoPulse is designed to be useful without AI, accounts or cloud setup. Optional AI-assisted suggestions may be added later, but the core product is deterministic, local-first and free to use.

> **Status:** Phase 2 — public repository fetch. Enter a GitHub username to fetch and view the first 100 public repositories. Deterministic checks and scoring arrive in later phases.

## Screenshots

_Coming soon._

## Quickstart

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [Rust](https://rustup.rs/) (stable toolchain, MSVC on Windows)
- WebView2 (ships with Windows 11)

### Run the desktop app

```bash
pnpm install
pnpm tauri dev
```

### Run only the frontend (faster iteration)

```bash
pnpm dev
```

This opens RepoPulse in your browser without compiling the Rust shell.

### Current app flow

1. Enter a public GitHub user account on the Welcome screen.
2. RepoPulse calls GitHub's public REST API without authentication.
3. The Dashboard shows public repository metadata such as name, description, language, stars, forks, updated date, fork status and archive status.

Phase 2 does not store fetched repository data, request a GitHub token, fetch repository contents, run deterministic checks or produce scores yet.

### Useful scripts

```bash
pnpm lint        # ESLint
pnpm typecheck   # TypeScript --noEmit
pnpm test        # Vitest
pnpm format      # Prettier write
```

## What RepoPulse checks (planned)

- README presence and section coverage
- License, contributing and security policy
- Setup, build and dependency manifests
- CI workflows and test detection
- Docker / deployment signals
- Screenshots, demo links and presentation quality
- Repository metadata (description, topics, homepage, activity)
- Project type classification

## What RepoPulse does **not** do

- Send repository contents to any third party
- Require a GitHub account or login
- Require AI keys for core functionality
- Persist anything to a remote database

## Roadmap

See [docs/roadmap.md](docs/roadmap.md) and [`repopulse_master_plan.md`](repopulse_master_plan.md) for the full long-form plan.

## Documentation

- [Product principles](docs/product-principles.md)
- [Architecture](docs/architecture.md)
- [Scoring model](docs/scoring-model.md)
- [Privacy model](docs/privacy.md)
- [AI expansion](docs/ai-expansion.md)
- [Roadmap](docs/roadmap.md)

## License

A license will be selected before the first public release.
