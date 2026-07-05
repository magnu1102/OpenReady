# GitHub Action

Phase 18 ships OpenReady as a composite GitHub Action, so any project can gate
CI on its OpenReady score and publish a score badge — without installing
anything. The action runs the CLI bundle committed at `dist-cli/openready.mjs`
directly; the only requirement is Node 20+, which every GitHub-hosted runner
already ships.

## Quick start

Fail pull requests when the repository scores below 70:

```yaml
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: magnu1102/OpenReady@v0.3.0
        with:
          username: OWNER
          repo: REPO
          fail-under: 70
```

Full copy-pasteable workflows live in [`docs/examples/`](./examples/):

- [`gate-on-pr.yml`](./examples/gate-on-pr.yml) — block PRs below a score threshold
- [`badge-refresh.yml`](./examples/badge-refresh.yml) — regenerate the badge on push and commit it back

## Inputs

| Input            | Default                 | Notes                                                                                |
| ---------------- | ----------------------- | ------------------------------------------------------------------------------------ |
| `username`       | (required)              | GitHub username whose public repositories are analyzed.                              |
| `repo`           | —                       | Focus a single repository (case-insensitive name or `owner/name`).                   |
| `token`          | `${{ github.token }}`   | GitHub token for API requests. Passed to the CLI via env, never on the command line. |
| `fail-under`     | —                       | Fail the action if any analyzed repository scores below this (0–100).                |
| `require-checks` | —                       | Comma- or space-separated custom check ids that must pass (needs a plugins setup).   |
| `profile`        | —                       | Path to an `openready.profile.v1` JSON file in your checkout.                        |
| `limit`          | `30`                    | Maximum repositories to analyze.                                                     |
| `no-readme`      | `false`                 | `"true"` skips README fetches.                                                       |
| `no-tree`        | `false`                 | `"true"` skips file-tree fetches.                                                    |
| `report-path`    | `openready-report.json` | Where the `openready.export.v1` JSON report is written.                              |
| `badge`          | `false`                 | `"true"` (both formats), `"endpoint"`, or `"svg"`.                                   |
| `badge-path`     | `openready-badge`       | Badge base path; the `.json`/`.svg` extension is appended.                           |
| `badge-label`    | `openready`             | Badge label text.                                                                    |

The action always runs `analyze --format json` (the report feeds the badge and
outputs). For table or Markdown output, run the [CLI](./cli.md) directly.

## Outputs

| Output                | Notes                                                                              |
| --------------------- | ---------------------------------------------------------------------------------- |
| `score`               | Badge score (single repository, or rounded average). Empty when unavailable.       |
| `color`               | shields.io color for the score (`brightgreen`/`green`/`yellow`/`red`/`lightgrey`). |
| `gate-passed`         | `"false"` when the CI gate failed, otherwise `"true"`.                             |
| `report-path`         | Path of the JSON report.                                                           |
| `badge-endpoint-path` | Path of the endpoint JSON badge; empty when not generated.                         |
| `badge-svg-path`      | Path of the SVG badge; empty when not generated.                                   |

## Gate behavior

A gate violation (CLI exit `4`) does **not** abort the action mid-way: the JSON
report, badges, and outputs are all still produced, and the action's final step
then fails with an annotated error. That means a badge-refresh workflow keeps
publishing an honest (red) badge even while the gate is failing. Any other CLI
failure — network, rate limit, invalid profile — aborts immediately with the
CLI's stderr in the step log.

## Badges

With `badge: "true"` the action writes both formats:

- **Endpoint JSON** (`<badge-path>.json`) — render it via shields.io:

  ```markdown
  ![OpenReady](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/OWNER/REPO/main/.github/badges/openready.json)
  ```

- **Static SVG** (`<badge-path>.svg`) — no third-party service at render time:

  ```markdown
  ![OpenReady](.github/badges/openready.svg)
  ```

Colors follow the health tiers: ≥ 85 `brightgreen`, 70–84 `green`, 50–69
`yellow`, < 50 `red`, and `lightgrey` when no score is available. See
[Badge generation](./cli.md#badge-generation-phase-18) in the CLI docs for the
underlying subcommand.

## Token and rate limits

The default `${{ github.token }}` lifts GitHub's ~60 requests/hour
unauthenticated limit. Note that the action analyzes the **public repositories
of `username`** — the token only authenticates the API requests; it does not
grant access to private repositories, and none are analyzed.

## Requirements

- Node 20+ on the runner. All current GitHub-hosted runners qualify. On
  self-hosted runners without Node, add a setup step before the action:

  ```yaml
  - uses: actions/setup-node@v4
    with:
      node-version: "20"
  ```

## Implementation pointers

- `action.yml` — the composite action (repo root)
- `src/modules/badge/` — pure badge generation (score selection, colors, renderers)
- `src/cli/gating.ts` — the gating evaluator behind `fail-under` / `require-checks`
- `.github/workflows/action-smoke.yml` — integration test running `uses: ./` against this repo
- `dist-cli/openready.mjs` — the committed CLI bundle the action executes
