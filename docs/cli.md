# CLI

Phase 11 exposes the deterministic analyzer through a Node CLI. The CLI reuses the same `github-client`, `analyzer-core`, `project-classifier`, `scoring-engine`, `recommendation-engine`, and `export-engine` modules as the desktop app, so output matches what the desktop renders for the same repository.

## Install

For now the CLI is shipped from source. Phase 12 will turn it into a release artifact.

```bash
pnpm install           # dev deps
pnpm cli -- --help     # dev run via tsx
pnpm build:cli         # produces dist-cli/openready.mjs
node dist-cli/openready.mjs --help
```

`package.json#bin` points at `dist-cli/openready.mjs`, so `npm link` or a future `npm install -g .` will register the `openready` binary globally.

## Usage

```
openready analyze <username> [options]
openready --help
openready --version
```

### Options

| Flag                               | Default | Notes                                                                                                            |
| ---------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| `--format <table\|json\|markdown>` | `table` | Terminal table by default; JSON and Markdown reuse the export engine.                                            |
| `--limit <n>`                      | `30`    | Mirrors the desktop's 30-repo cap for READMEs and trees.                                                         |
| `--repo <name>`                    | —       | Focus a single repository (case-insensitive match on name or full name). Exits with code `3` if nothing matches. |
| `--out <path>`                     | —       | Write rendered output to a file instead of stdout.                                                               |
| `--token <value>`                  | —       | GitHub PAT. Overrides env vars.                                                                                  |
| `--no-readme`                      | off     | Skip README fetches. README-dependent checks fall back to `unknown`.                                             |
| `--no-tree`                        | off     | Skip file-tree fetches. Classification falls back to `unknown`.                                                  |

### Token resolution

`--token` → `OPENREADY_GITHUB_TOKEN` → `GITHUB_TOKEN`. Tokens are attached as `Authorization: Bearer <token>` headers on every GitHub request. Without one, GitHub limits unauthenticated requests to ~60 per hour.

### Output rules

- **Terminal**: colored fixed-width table. Honors [`NO_COLOR`](https://no-color.org/) and falls back to plain text when stdout is not a TTY. The legend at the bottom shows the score colour bands (green ≥ 85, cyan ≥ 70, yellow ≥ 50, red < 50).
- **JSON**: identical to the desktop's "Export → JSON" output (`openready.export.v1`).
- **Markdown**: identical to the desktop's "Export → Markdown" output.

### Custom checks and CI gating (Phase 16)

Phase 16 adds flags for loading [check packs](./plugins.md) and gating CI runs:

| Flag                   | Default | Notes                                                                                                                                                                                                                            |
| ---------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--profile <path>`     | —       | Apply an `openready.profile.v1` JSON file. Category weights multiply into scoring exactly like the desktop Settings weights; `thresholds.failUnder` is the default score gate. `role` and `enabledPacks` are ignored by the CLI. |
| `--plugins <path>`     | —       | Load a check pack from a JS/MJS file or a pack directory. Repeatable. Refused without `--allow-plugins`.                                                                                                                         |
| `--allow-plugins`      | off     | Explicit consent to execute third-party pack code.                                                                                                                                                                               |
| `--fail-under <n>`     | —       | Exit `4` if any analyzed repository scores below `n` (0–100). Overrides the profile threshold. Repositories with a `null` score never trip this gate.                                                                            |
| `--require-check <id>` | —       | Exit `4` unless custom check `id` exists **and** passes for every repository. Repeatable.                                                                                                                                        |

Profile and pack inputs are resolved before any GitHub request, so a bad path or
manifest fails fast (exit `2`) without burning rate limit. When packs run, each
repository in the JSON output gains an additive `customChecks` array; table and
Markdown output are unchanged. Gate violations are written to stderr
(`openready: gate: …`), one per line, after the rendered output is emitted — so a
`--out` file or piped JSON is still produced even when the gate fails. See
[Custom checks, packs, and profiles](./plugins.md) for the authoring guide.

```bash
# Fail CI when any repository drops below 70 or ships without a changelog
openready analyze octocat --fail-under 70 \
  --plugins ./acme-pack --allow-plugins --require-check acme/has-changelog
```

### Exit codes

| Code | Meaning                                                                       |
| ---- | ----------------------------------------------------------------------------- |
| 0    | Success, including the "user has no public repositories" case.                |
| 1    | Generic failure (network, rate limit, GitHub error, write error).             |
| 2    | Invalid command-line usage, including a bad `--profile` or `--plugins` input. |
| 3    | `--repo` was supplied but no repository matched.                              |
| 4    | The CI gate failed (`--fail-under` or `--require-check`).                     |

## Examples

```bash
# Quick terminal summary (3 newest repos, metadata only)
pnpm cli -- analyze octocat --limit 3 --no-readme --no-tree

# Save a full JSON snapshot using a token from env
GITHUB_TOKEN=ghp_... pnpm cli -- analyze octocat --format json --out octocat.json

# Markdown report for a single repository
pnpm cli -- analyze octocat --repo Hello-World --format markdown

# Pipe through jq
pnpm cli -- analyze octocat --format json | jq '.repositories[] | {name, score: .score.total}'
```

## Implementation pointers

- `src/cli/index.ts` — entry, help/version, dispatch by parsed kind
- `src/cli/args.ts` — `node:util parseArgs` wrapper returning a tagged union
- `src/cli/auth.ts` — token chain helper
- `src/cli/run.ts` — orchestrates fetch → classify → analyze → render
- `src/cli/renderers/{table,color}.ts` — terminal table + ANSI helper
- `scripts/build-cli.mjs` — esbuild bundle to `dist-cli/openready.mjs`
