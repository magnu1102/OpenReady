# Project classification

Phase 9 sorts repositories into one of six core project types plus an `unknown` fallback, then uses the type to tune scoring and to add a small number of type-relevant checks. The desktop app shows a chip with the detected type and confidence; both the desktop app and CLI score with the matching type profile.

This document is the source of truth for the classifier and the per-type profiles. Master plan §8 is the strategic context.

## Types

| Type         | Detected from                                                                                                                                                                                                                          |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend`   | `index.html`, framework configs (`vite.config.*`, `next.config.*`, `astro.config.*`, `svelte.config.*`, `angular.json`, `nuxt.config.*`, `gatsby-config.*`, `remix.config.*`), `public/`, `src/components` or `src/pages` or `src/app` |
| `backend`    | `Procfile`, `manage.py` / `wsgi.py` / `asgi.py`, `main.go` with `go.mod`, an `api/` / `server/` / `backend/` root directory, or Dockerfile + a server-language manifest with no frontend bundler                                       |
| `full-stack` | Frontend signals **and** backend signals both clear (the classifier collapses the pair into `full-stack`)                                                                                                                              |
| `desktop`    | `src-tauri/`, `tauri.conf.json`, Electron / Forge config, or an Inno Setup `.iss` script. Wins over `frontend` when both fire                                                                                                          |
| `cli`        | `bin/` directory, Go `cmd/` with `go.mod`, or `src/main.rs` with `Cargo.toml` and no Tauri shell                                                                                                                                       |
| `library`    | A package manifest plus a `lib/` or `src/index.{ts,js}` / `src/lib.rs` export, **and** no app or server hints                                                                                                                          |
| `unknown`    | No identifying signals — or no tree available. The default profile applies (no weight changes, no extras).                                                                                                                             |

## Confidence

Each candidate type accumulates "reasons" (one per matched rule). The winning type's lead over the runner-up determines confidence:

| Lead in matched reasons | Confidence |
| ----------------------- | ---------- |
| ≥ 2                     | `high`     |
| 1                       | `medium`   |
| 0 (tie)                 | `low`      |

The `ClassificationResult` exposes both the chosen `type` and the `detectedType`, so a manual override still surfaces the original auto-detection in the UI.

## Profiles

Each type maps to a `ClassificationProfile` with two parts: category weights (defaults to 1) and zero-or-more extra checks. Profiles live in `src/modules/project-classifier/profiles.ts`.

### Category weights

| Category                 | frontend | backend | full-stack | desktop | cli  | library |
| ------------------------ | -------- | ------- | ---------- | ------- | ---- | ------- |
| documentation            | 1        | 1       | 1          | 1       | 1.25 | 1.5     |
| presentation             | **2**    | 0.5     | 1.5        | 1.5     | 0.25 | 0.25    |
| buildability             | 1        | 1       | 1          | 1       | 1    | 1       |
| maintainability          | 1        | 1       | 1          | 1       | 1    | 1       |
| testing-ci               | 1        | 1.5     | 1.25       | 1       | 1.25 | 1.5     |
| deployment-operations    | 0.5      | 1.5     | 1.25       | 1.25    | 1    | 0.25    |
| metadata-discoverability | 1        | 1       | 1          | 1       | 1    | 1       |
| security                 | 1        | 1.25    | 1          | 1       | 1    | 1       |

`unknown` keeps every weight at 1 — the Phase 5 behaviour.

### Extra checks

Type profiles append additional check ids on top of the standard analyzer output. These are README-pattern checks; if no README is available, they fall through to `unknown` or `not-applicable` rather than fabricating a fail.

| Check id                          | Added for           | Question                                                              |
| --------------------------------- | ------------------- | --------------------------------------------------------------------- |
| `api-section-in-readme`           | backend, full-stack | Does the README have an API / Endpoints / Routes / Reference section? |
| `release-artifact-link-in-readme` | desktop             | Does the README link to a Releases page or installer?                 |
| `cli-usage-example-in-readme`     | cli                 | Does the README show at least one shell invocation?                   |
| `api-or-usage-section-in-readme`  | library             | Does the README document the public API or usage?                     |

The `release-artifact-link-in-readme` check is routed to the **presentation** score category via the scoring engine's id allow-list, even though its check category is `documentation`.

## Manual override

The desktop detail route exposes a `<select>` of the six selectable types plus "Auto-detect". Choosing a type calls `repositoryStore.overrideClassification(repoId, type)`, which re-runs `analyzeRepository` with that type and persists the snapshot. The override lives inside `AnalysisResult.classificationOverride` so it survives reloads and migrates with the cache schema (currently v2).

## Implementation pointers

- `src/modules/project-classifier/index.ts` — `classifyRepository(repository, treeState, techSignals, override?)`
- `src/modules/project-classifier/profiles.ts` — `profileFor(type)` plus the per-type profiles described above
- `src/modules/scoring-engine/index.ts` — `scoreChecks(checks, weights)` consumes the profile's `categoryWeights`
- `src/modules/analyzer-core/index.ts` — calls the classifier, appends `profile.extraChecks(ctx)`, and forwards weights to the scoring engine
