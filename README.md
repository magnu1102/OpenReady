# OpenReady

OpenReady is an open-source desktop app that analyzes GitHub repositories and helps developers understand which projects are clear, healthy and ready to share. It checks public repositories for documentation, setup instructions, licensing, CI, technology signals, presentation quality and other practical indicators, then turns the findings into transparent scores and actionable improvement suggestions.

OpenReady is designed to be useful without AI, accounts or cloud setup. Optional AI-assisted suggestions may be added later, but the core product is deterministic, local-first and free to use.

> **Status:** Phase 7 - export system. Enter a GitHub username to fetch public repositories, run deterministic metadata, README and file-tree checks, then export transparent reports, JSON summaries and homepage project cards.

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

This opens OpenReady in your browser without compiling the Rust shell.

### Current app flow

1. Enter a public GitHub user account on the Welcome screen.
2. OpenReady calls GitHub's public REST API without authentication.
3. The Dashboard shows public repository metadata, health labels, scores and key missing signals.
4. Open a repository to review score breakdowns, detected stack, documentation checks, build/test checks, presentation signals and prioritized recommendations.
5. Export the current analysis as Markdown, JSON or homepage-card Markdown from the Dashboard.

Phase 7 keeps fetched analysis data in memory only, requests no GitHub token, and saves export files only to locations selected through the desktop save dialog.

### Useful scripts

```bash
pnpm lint        # ESLint
pnpm typecheck   # TypeScript --noEmit
pnpm test        # Vitest
pnpm format      # Prettier write
```

## What OpenReady checks

- README presence and section coverage
- Repository description, topics, homepage/demo URL and license metadata
- Recent activity, archived status and fork status
- Setup, usage, screenshots/demo, tech stack, testing and roadmap README sections
- Setup, build and dependency manifests
- CI workflows and test detection
- Docker / deployment signals
- Screenshots, demo links and presentation quality
- Repository metadata (description, topics, homepage, activity)
- Prioritized per-repository recommendations
- Markdown, JSON and homepage-card exports

## What OpenReady does **not** do

- Send repository contents to any third party
- Require a GitHub account or login
- Require AI keys for core functionality
- Persist anything to a remote database

## Roadmap

See [docs/roadmap.md](docs/roadmap.md) and [`openready_master_plan.md`](openready_master_plan.md) for the full long-form plan.

## Documentation

- [Product principles](docs/product-principles.md)
- [Architecture](docs/architecture.md)
- [Scoring model](docs/scoring-model.md)
- [Privacy model](docs/privacy.md)
- [AI expansion](docs/ai-expansion.md)
- [Roadmap](docs/roadmap.md)

## License

A license will be selected before the first public release.
