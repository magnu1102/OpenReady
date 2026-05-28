# Tech-stack detection

Phase 4 inspects the repository file tree to detect packaging, build, test, CI, container and infrastructure signals, and to surface a per-repository tech stack alongside the existing Phase 3 metadata and README checks.

This document describes what the detection does, what it deliberately does not do, and how the rate-limit budget breaks down.

## What is fetched

OpenReady calls one additional GitHub endpoint per analysed repository:

```
GET /repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1
```

The response is a flat list of blob and tree entries. OpenReady reads only `path` and `type`. File contents are not downloaded — Phase 4 makes no claims that require reading inside a file.

The fetcher honours GitHub's `truncated: true` flag. Large monorepos that exceed GitHub's response limit are surfaced as a truncated tree, and any _failing_ deterministic check on that repository falls back to `unknown` so the analyzer never makes a negative claim it cannot justify. Positive detections from a partial tree are still reported, since the evidence is direct.

Empty repositories and missing default branches (HTTP 404 and 409) are treated as an empty tree, and the resulting checks render as `not-applicable`.

## Detected signals

Detection is filename- and path-based. Each signal reports up to three evidence paths.

| Signal id        | Label          | Match                                                                                                                                     |
| ---------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `node`           | Node.js        | `package.json`, `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, `bun.lockb`                                                           |
| `python`         | Python         | `pyproject.toml`, `requirements.txt`, `Pipfile`, `Pipfile.lock`, `setup.py`, `setup.cfg`, `poetry.lock`                                   |
| `rust`           | Rust           | `Cargo.toml`, `Cargo.lock`                                                                                                                |
| `go`             | Go             | `go.mod`, `go.sum`                                                                                                                        |
| `java-gradle`    | Java / Gradle  | `build.gradle`, `build.gradle.kts`, `settings.gradle*`                                                                                    |
| `android`        | Android        | `AndroidManifest.xml`                                                                                                                     |
| `docker`         | Docker         | `Dockerfile`, `docker-compose.{yml,yaml}`, `.dockerignore`                                                                                |
| `github-actions` | GitHub Actions | Any `.yml`/`.yaml` under `.github/workflows/`                                                                                             |
| `terraform`      | Terraform      | Any `.tf` or `.tfvars`                                                                                                                    |
| `kubernetes`     | Kubernetes     | Helm `Chart.yaml`/`values.yaml`, or `.yml`/`.yaml` under `k8s/`, `kubernetes/`, `manifests/`, `deploy/`                                   |
| `docs-folder`    | docs/ folder   | `docs/` or `documentation/` entries                                                                                                       |
| `tests`          | Tests          | `tests/`, `test/`, `__tests__/`, `spec/` directories; `*.{test,spec}.{ts,tsx,js,jsx}`, `*_test.go`, `*_test.py`, `test_*.py`, `*_spec.rb` |

The Kubernetes heuristic intentionally prefers precision over recall: arbitrary YAML outside well-known infra folders is not flagged, to avoid false positives on application config files.

## Checks produced

| Check id                 | Category         | Behaviour                                                                                                                                                            |
| ------------------------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build-manifest`         | buildability     | Passes if any Node, Python, Rust, Go or Gradle manifest is detected.                                                                                                 |
| `lockfile`               | buildability     | Passes if a lockfile is committed. Evidence is the matched filename.                                                                                                 |
| `dockerfile`             | containerization | Passes if any Docker file is detected.                                                                                                                               |
| `github-actions`         | ci               | Passes if any workflow file under `.github/workflows/` is detected.                                                                                                  |
| `tests-present`          | tests            | Passes if any test directory or test file is detected.                                                                                                               |
| `infrastructure-as-code` | infrastructure   | Passes when Terraform or Kubernetes manifests are detected. Reports `not-applicable` for typical apps so it never appears as a missing signal on non-infra projects. |
| `docs-folder`            | documentation    | Passes if a `docs/` or `documentation/` folder ships with the repository.                                                                                            |

Phase 4 deliberately does not change health labelling. New checks contribute to `passedCount`, `failedCount`, `unknownCount` and `missingSignals`, but `chooseHealthLabel` keeps the Phase 3 logic. Scoring and label weighting are owned by Phase 5.

## Rate-limit budget

Phase 4 adds one extra request per repository to the existing two (user repo list and README), for a total of up to three requests per repository. With the `TREE_FETCH_LIMIT = 30` cap mirroring the README fetch, a single analysis costs at most:

- 1 request for the user repository list
- up to 30 README requests
- up to 30 tree requests

GitHub's unauthenticated quota is 60 requests per hour per IP. A first analysis of a profile with at least 30 repositories will use the full quota and may surface a rate-limit error on retry. Token mode (shipped in Phase 8 for the desktop app, and in Phase 11 for the CLI) lifts this to 5,000 requests per hour.

## What Phase 4 does not do

- It does not read manifest _contents_ — dependency lists, framework names and project names are not extracted. This is a Phase 5+ enhancement.
- It does not classify the repository as frontend, backend, full-stack, etc. Project classification arrived in Phase 9 — see [`classification.md`](classification.md), which consumes the same file-tree paths and tech signals defined here.
- It does not weight signals into a score. Scoring is Phase 5; Phase 9 added per-type category weights on top.
