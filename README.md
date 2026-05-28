# OpenReady

OpenReady is an open-source desktop app that analyzes GitHub repositories and helps developers understand which projects are clear, healthy and ready to share. It checks public repositories for documentation, setup instructions, licensing, CI, technology signals, presentation quality and other practical indicators, then turns the findings into transparent scores and actionable improvement suggestions.

OpenReady is designed to be useful without AI, accounts or cloud setup. Optional AI-assisted suggestions may be added later, but the core product is deterministic, local-first and free to use.

> **Status:** Phase 11 — CLI version. The desktop app classifies repositories by project type, applies type-weighted scoring, ships a guided onboarding tour and command palette (⌘K / ⌘/), and now exposes the same deterministic analyzer through a Node CLI (`openready analyze <username>` with table, JSON or Markdown output).

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
2. OpenReady calls GitHub's public REST API, optionally using a locally stored token for higher rate limits.
3. The Dashboard shows public repository metadata, health labels, scores and key missing signals.
4. Open a repository to review score breakdowns, detected stack, documentation checks, build/test checks, presentation signals and prioritized recommendations.
5. Reopen a recent local analysis, refresh it on demand, or export it as Markdown, JSON or homepage-card Markdown from the Dashboard.

Phase 8 caches recent public analysis snapshots locally, stores optional GitHub tokens in the operating system credential store, and saves export files only to locations selected through the desktop save dialog.

### Run the CLI

OpenReady ships a Node CLI that runs the same deterministic analyzer outside the desktop shell — useful in scripts, CI, or a quick terminal check.

```bash
# Dev runs via tsx
pnpm cli -- analyze octocat --limit 5 --no-readme --no-tree

# Build a self-contained ESM bundle
pnpm build:cli
node dist-cli/openready.mjs analyze octocat --format json --out octocat.json
```

Common flags:

| Flag                             | Purpose                                    |
| -------------------------------- | ------------------------------------------ |
| `--format table\|json\|markdown` | Output format (default `table`)            |
| `--limit <n>`                    | Max repositories analysed (default 30)     |
| `--repo <name>`                  | Focus a single repository                  |
| `--out <path>`                   | Write output to a file instead of stdout   |
| `--token <value>`                | GitHub PAT for higher rate limits          |
| `--no-readme` / `--no-tree`      | Skip README or file-tree fetches for speed |

Token resolution order: `--token`, then `OPENREADY_GITHUB_TOKEN`, then `GITHUB_TOKEN`. Without a token GitHub limits unauthenticated requests to ~60/hour. Output respects [`NO_COLOR`](https://no-color.org/) and falls back to plain text when stdout isn't a TTY.

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
- Local cache restore and explicit refresh

## What OpenReady does **not** do

- Send repository contents to any third party
- Require a GitHub account or login
- Require AI keys for core functionality
- Persist anything to a remote database
- Store GitHub tokens in browser local storage

## Roadmap

See [docs/roadmap.md](docs/roadmap.md) and [`openready_master_plan.md`](openready_master_plan.md) for the full long-form plan.

## Documentation

- [Product principles](docs/product-principles.md)
- [Architecture](docs/architecture.md)
- [Scoring model](docs/scoring-model.md)
- [Project classification](docs/classification.md)
- [Tech-stack detection](docs/tech-stack-detection.md)
- [CLI](docs/cli.md)
- [Onboarding and keyboard](docs/onboarding-and-keyboard.md)
- [Privacy model](docs/privacy.md)
- [AI expansion](docs/ai-expansion.md)
- [Roadmap](docs/roadmap.md)

## License

A license will be selected before the first public release.
