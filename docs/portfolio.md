# Portfolio mode

Phase 14 adds a job-seeker lens on top of the analyzer. The **Portfolio** route
(`/portfolio`) takes the same deterministic `AnalysisResult`s the dashboard shows and reframes them
for a target role: which repositories to feature, résumé bullet points, and interview talking
points. Everything is computed locally with no network calls and no AI — it only reads data already
present in the analysis.

Master plan §13 Phase 14 lists "personal homepage sync" as well; **writing back** to a GitHub Pages
repo is deferred. This phase generates and saves files locally only.

## Role model

A `RoleId` is one of `frontend`, `backend`, `full-stack`, `mobile`, `devops`, `data`, or
`generalist` (the neutral fallback). Each has a `RolePreset`
(`src/modules/portfolio/roles.ts`) mapping it to relevant `ProjectType`s, `TechSignalId`s, and
languages.

- **`scoreRepoForRole(analysis, techSignals, role)`** returns a relevance score and human-readable
  reasons. It starts from the repo's total score and adds bonuses: `+15` for a matching project
  type, `+8` per matching tech signal (capped at `+24`), `+10` for a matching language, and `+5` for
  a hidden gem.
- **`suggestRole(analyses, signalsById)`** sums each specific role's bonus across the user's repos
  and returns the strongest, falling back to `generalist` when nothing stands out.

The selected role lives in `portfolioStore` (persisted, key `openready-portfolio`). `"auto"` means
"use `suggestRole`"; the route resolves the effective role for display and export.

## Featuring

**`selectFeatured(analyses, signalsById, role, overrides, limit?)`** ranks repositories by relevance
and returns the top N (default 6). Forks and archived repos are excluded from the automatic list.
The `overrides` map lets the user override that: `true` force-includes (pins) a repo even if it's a
fork/archived; `false` force-excludes it. Pinned repos always survive the limit. In the UI the pin
button cycles a repo through **auto → pinned → excluded → auto** via `portfolioStore.togglePin`.

## Generated content

- **`buildCvBullets(featured, role)`** — résumé bullets per featured repo, built only from facts in
  the analysis: project type, language, description, CI/tests/Docker (derived from passed checks),
  the OpenReady score, and stars. No invented metrics.
- **`buildTalkingPoints(analysis, techSignals)`** — `highlights` (strongest category, stack, hidden
  gem), `likelyQuestions` (templated from the project type and test presence), and `gapsToOwn` (top
  recommendations, falling back to missing signals).

## Exports

The export engine (`src/modules/export-engine/index.ts`) adds three Markdown formats to
`ExportFormat`, all saved through the existing `saveExportFile` dialog:

| Format           | Function                      | Filename suffix      |
| ---------------- | ----------------------------- | -------------------- |
| `portfolio`      | `exportPortfolioMarkdown`     | `-portfolio.md`      |
| `cv`             | `exportCvBullets`             | `-cv-bullets.md`     |
| `talking-points` | `exportTalkingPointsMarkdown` | `-talking-points.md` |

## Implementation pointers

- Module: `src/modules/portfolio/{roles.ts,index.ts}` (pure, tested).
- Store: `src/store/portfolioStore.ts`.
- UI: `src/routes/PortfolioRoute.tsx`, sidebar entry in `src/components/shell/Sidebar.tsx`.
- The CLI is unaffected — portfolio mode is desktop-only and adds no CLI flags.
