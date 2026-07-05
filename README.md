# OpenReady

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![lint-and-test](https://github.com/magnu1102/OpenReady/actions/workflows/lint-and-test.yml/badge.svg)](https://github.com/magnu1102/OpenReady/actions/workflows/lint-and-test.yml)

OpenReady is an open-source desktop app that analyzes GitHub repositories and helps developers understand which projects are clear, healthy and ready to share. It checks public repositories for documentation, setup instructions, licensing, CI, technology signals, presentation quality and other practical indicators, then turns the findings into transparent scores and actionable improvement suggestions.

OpenReady is designed to be useful without AI, accounts or cloud setup. Optional AI-assisted suggestions may be added later, but the core product is deterministic, local-first and free to use.

> **Status:** v0.2.0 — Phase 16, plugins and ecosystem. The deterministic core covers analysis, scoring, recommendations, hidden-gem detection, repository comparison, and a role-targeted **Portfolio** mode with CV and talking-point exports. Phase 15 added an optional, opt-in AI assist (bring your own key; never required). Phase 16 added custom check packs, shareable team profiles, versioned JSON Schemas, and CI gating in the CLI (`--fail-under`, `--require-check`). See the [roadmap](docs/roadmap.md) for what's next.

## Screenshots

![Dashboard — deterministic health scores for every public repository](docs/screenshots/dashboard-dark.png)

|                                          Repository detail                                           |                                     Portfolio mode                                     |
| :--------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------: |
| ![Score breakdown, signals and evidence per repository](docs/screenshots/repository-detail-dark.png) | ![Role-targeted featured projects with CV export](docs/screenshots/portfolio-dark.png) |

|                           Light theme                            |                                 Welcome screen                                 |
| :--------------------------------------------------------------: | :----------------------------------------------------------------------------: |
| ![Dashboard in light mode](docs/screenshots/dashboard-light.png) | ![Welcome screen with local cache restore](docs/screenshots/welcome-light.png) |

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

### Use in CI

The repo doubles as a composite GitHub Action: gate pull requests on your OpenReady score and publish a score badge, with zero install.

```yaml
- uses: magnu1102/OpenReady@v0.3.0
  with:
    username: OWNER
    repo: REPO
    fail-under: 70
```

See [docs/github-action.md](docs/github-action.md) for the inputs/outputs reference, badge setup, and copy-pasteable example workflows.

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
- [GitHub Action](docs/github-action.md)
- [JSON schemas](docs/json-schema.md)
- [Custom checks and profiles](docs/plugins.md)
- [Portfolio mode](docs/portfolio.md)
- [Onboarding and keyboard](docs/onboarding-and-keyboard.md)
- [Releasing](docs/releasing.md)
- [Signing notes](docs/signing.md)
- [Privacy model](docs/privacy.md)
- [AI expansion](docs/ai-expansion.md)
- [Roadmap](docs/roadmap.md)
- [Changelog](CHANGELOG.md)

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, the quality
gates, and the pull-request flow, and our [Code of Conduct](CODE_OF_CONDUCT.md). To report a
vulnerability, see [SECURITY.md](SECURITY.md) — please don't open a public issue for security
problems.

## License

OpenReady is open source under the [MIT License](LICENSE).
