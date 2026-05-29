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

### User-customizable weights (Phase 13)

The effective weight passed to `scoreChecks` is the **profile weight times a user multiplier**:

```
finalWeight[category] = (profileWeight[category] ?? 1) * (userWeight[category] ?? 1)
```

User multipliers live in the persisted `preferencesStore` (one per category, default `1`, range `0`–`3`) and are edited from the **Scoring weights** card in Settings. `mergeWeights` in `src/modules/analyzer-core/index.ts` performs the combination, so classification still shapes scoring while user preferences nudge it. Setting a category to `0` removes it from the weighted mean entirely. The CLI passes no user weights, so its output is unaffected.

## Score impact for recommendations (Phase 13)

Recommendations carry a `scoreImpact`: the projected rise in the total score if that single failing check were resolved. It is computed in `src/modules/recommendation-engine/index.ts` by re-running `scoreChecks` with the target check flipped to `passed` (against the active weights) and taking the difference. Recommendations sort by a combined key — `PRIORITY_WEIGHTS[priority] * 10 + scoreImpact` — so a missing license still ranks near the top while a high-impact "medium" can climb above a low-impact "high". The detail view renders this as a `+N pts` badge.

## Hidden-gem detection (Phase 13)

Every `AnalysisResult` carries a `hiddenGem` flag. A repository qualifies when it scores well (`total >= 70`) yet has low reach (`stars <= 5`) and at least one discoverability gap (no topics, homepage, or description), excluding archives and forks. Thresholds are absolute and deterministic (no network, no per-account statistics) so the app and CLI agree. The dashboard surfaces a badge per card and a summary count.

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

- **Score history and trends** — comparing a repository against its own past snapshots is still future work.
- **Per-account relative hidden-gem thresholds** — the current detector uses absolute thresholds; a median-based variant remains a possible refinement.

## Implementation pointer

The pure scoring function lives in `src/modules/scoring-engine/index.ts`. It takes `CheckResult[]` and returns `RepositoryScore`. It has no I/O and no React dependency, so the CLI (Phase 11) can reuse it as-is.
