# Scoring model

Phase 5 turns the analyzer's deterministic check results into a single transparent score per repository — eight category scores plus a total — and replaces the Phase 3 label with a tier-based health label.

This document is the source of truth for the formula. Master plan §9 is the strategic context.

## Principles

- **Evidence-based.** Every score reduces to specific check ids you can read in the detail view. There are no hidden adjustments.
- **No fabrication.** `not-applicable` and `unknown` are excluded from denominators. Missing data never inflates failure.
- **Stable.** The formula is the same across all repositories. Type-specific weighting is deliberately deferred to Phase 9.

## Categories

Eight categories match master plan §9.1. Each maps to one or more analyzer check categories or specific check ids:

| Score category             | Contributing checks                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------ |
| Documentation              | `readme`, `readme-*` (excluding `readme-screenshots-demo`), `docs-folder`            |
| Presentation               | `homepage`, `readme-screenshots-demo`                                                |
| Buildability               | `build-manifest`, `lockfile`                                                         |
| Maintainability            | `recent-activity`, `not-archived`, `original-repository`                             |
| Testing & CI               | `tests-present`, `github-actions`                                                    |
| Deployment & operations    | `dockerfile`, `infrastructure-as-code`                                               |
| Metadata & discoverability | `description`, `topics`, `homepage` excluded (counted under presentation), `license` |
| Security hygiene           | `security-md`, `env-example`                                                         |

## Formula

For each category:

```
applicable = count(passed) + count(failed)
score      = applicable === 0 ? null : round(passed / applicable * 100)
```

Total (Phase 9 onward — weighted mean):

```
applicableCategories = categories.filter(c => c.score !== null)
weightSum = sum(applicableCategories.map(c => c.weight))
total = applicableCategories.length === 0 || weightSum === 0
      ? null
      : round(sum(applicableCategories.map(c => c.score * c.weight)) / weightSum)
```

Each `CategoryScore` carries a `weight` (default `1`). The default profile keeps Phase 5's equal-weighted behaviour, but the project classifier (Phase 9) supplies per-type weights via a `ClassificationProfile` so a frontend repo emphasises presentation while a CLI emphasises documentation and testing. See [`classification.md`](classification.md) for the full per-type tables.

The `RepositoryScore` returned by `scoreChecks` also exposes `weakestCategory` and `strongestCategory`, used by the detail view's breakdown panel — these stay derived from raw category scores, independent of weight.

## Tier labels

The total score maps to a `HealthLabel`:

| Total score | Label           |
| ----------- | --------------- |
| ≥ 85        | Portfolio-ready |
| 70–84       | Almost ready    |
| 50–69       | Needs work      |
| < 50        | Experimental    |

Three overrides take precedence over the tier:

- **Archived** — repository is archived.
- **Fork** — repository is a fork.
- **Stale** — `recent-activity` failed (no push in the last 12 months).

A transient **Analyzing** label appears when every category's score is `null` — usually only during the brief window where README and tree data are still arriving from GitHub.

## What is intentionally deferred

- **User-defined weights.** Type weights ship as part of Phase 9, but per-user custom weighting (master plan §9.5) is still future work.
- **Hidden gem detection** (master plan §9.3) — owned by Phase 13.
- **Score history and trends** — Phase 13+.

## Implementation pointer

The pure scoring function lives in `src/modules/scoring-engine/index.ts`. It takes `CheckResult[]` and returns `RepositoryScore`. It has no I/O and no React dependency, so the CLI (Phase 11) can reuse it as-is.
