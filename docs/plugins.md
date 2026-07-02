# Custom checks, packs, and profiles

Phase 16 adds an extensibility layer on top of OpenReady's deterministic core: **custom
checks** bundled into **check packs**, plus shareable **team profiles**. Custom checks
are informational — they render in their own surface and never alter the built-in
0–100 score, so the core stays transparent and reproducible.

> **Status.** The plugin module, pack loader, profiles parser, and gating evaluator
> shipped in Phase 16 and are covered by unit tests. The CLI already parses the flags
> documented below, but `analyze` does not yet execute plugins or enforce the gate —
> that wiring is the remaining Phase 16 work, and the desktop app does not load packs
> yet either. This page documents the stable authoring API; the "CLI integration"
> section describes the contract that wiring will follow.

## Trust model (read this first)

A check pack is **third-party JavaScript**. You trust it the same way you trust an
installed npm devDependency. OpenReady reduces the blast radius but does not pretend
to fully sandbox arbitrary code:

- Nothing runs until you explicitly enable a pack. Off by default, everywhere.
- Checks receive only a plain-data snapshot — no network, no DOM, no app state, no
  GitHub token, no Tauri handles.
- A throwing or malformed check becomes an `unknown` result; it can never crash
  analysis.
- Nothing is sent off your machine.
- In the CLI, `--plugins` is refused unless you also pass `--allow-plugins`.

## Authoring a check

A check is an object implementing `CheckPlugin`
([`src/modules/check-plugins/types.ts`](../src/modules/check-plugins/types.ts)):

```ts
import type { CheckPlugin } from "@/modules/check-plugins";

export const hasChangelog: CheckPlugin = {
  id: "acme/has-changelog", // must match vendor/check-name (lowercase, digits, dashes)
  label: "Repository ships a CHANGELOG",
  category: "documentation", // optional; defaults to "custom"
  run: (ctx) => ({
    status: ctx.hasPath("CHANGELOG*") ? "passed" : "failed",
    evidence: ctx.hasPath("CHANGELOG*") ? undefined : "No CHANGELOG file found.",
  }),
};
```

`run` is synchronous, receives a read-only `CheckContext`, and returns
`{ status, evidence? }` where `status` is `passed`, `failed`, `not-applicable`, or
`unknown`. `evidence` is clipped to 300 characters.

### Context helpers

| Member                      | What it gives you                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `ctx.repository`            | Repository metadata (name, description, topics, language, stars, dates, …).                                           |
| `ctx.readme`                | `{ found, content }` — the README body, or `""` when missing.                                                         |
| `ctx.tree`                  | `{ available, truncated, paths }` — committed file paths from the Git tree.                                           |
| `ctx.techSignals`           | The detected stack signals the analyzer already computed.                                                             |
| `ctx.hasPath(glob\|RegExp)` | True if any tree path (or its basename) matches. Globs: `*` within a segment, `**` across segments; case-insensitive. |
| `ctx.readmeMatches(RegExp)` | Test the README body.                                                                                                 |
| `ctx.hasTopic(name)`        | Case-insensitive topic membership.                                                                                    |

### Failure semantics

The runner ([`run.ts`](../src/modules/check-plugins/run.ts)) guarantees one result per
check and downgrades every problem to an `unknown` result with the reason as evidence:

- an id that doesn't match `vendor/check-name`
- a duplicate id (only the first is used)
- a missing or invalid `status`
- a thrown error (the message is captured)

## Packs

A pack bundles a manifest with its checks. The manifest is validated against
[`schemas/openready.pack.v1.schema.json`](../schemas/openready.pack.v1.schema.json) —
see [JSON schemas](./json-schema.md).

```ts
import type { CheckPack } from "@/modules/check-plugins";

export const pack: CheckPack = {
  manifest: {
    schema: "openready.pack.v1",
    name: "Acme Checks",
    version: "1.0.0",
    author: "Acme",
    description: "House rules for Acme repositories.",
    checkIds: ["acme/has-changelog"],
  },
  checks: [hasChangelog],
};

export default pack;
```

The Node loader ([`loadNode.ts`](../src/modules/check-plugins/loadNode.ts)) accepts two
shapes per `--plugins` path:

- **A JS/MJS file** whose default export is a `CheckPack`, a `{ checks: [...] }`
  object, or a plain `CheckPlugin[]` array. A file without a manifest gets a synthetic
  one (`version: "0.0.0"`, named after the file).
- **A directory** containing `openready-pack.json` (the manifest, schema-validated)
  plus an entry module: `index.mjs`, `index.js`, or `pack.mjs`.

Distribution is by local file import — there is no remote registry.

### The official reference pack

[`src/modules/check-plugins/official/`](../src/modules/check-plugins/official) ships
with OpenReady as a working example. Its checks are useful but intentionally
opinionated, which is why they are informational rather than scored:

| Check id                    | Verifies                                      |
| --------------------------- | --------------------------------------------- |
| `openready/changelog`       | A `CHANGELOG*` file is committed.             |
| `openready/contributing`    | A `CONTRIBUTING*` file is committed.          |
| `openready/issue-templates` | `.github/ISSUE_TEMPLATE/` exists.             |
| `openready/license-file`    | A `LICENSE*` or `COPYING*` file is committed. |

## Profiles

A team profile standardizes what "ready" means across a team: category weights, an
optional score threshold, an optional target role, and the pack names the team wants
enabled. Profiles are pure JSON — importing one never executes code. The shape is
[`schemas/openready.profile.v1.schema.json`](../schemas/openready.profile.v1.schema.json),
parsed and normalized by [`src/modules/profiles/index.ts`](../src/modules/profiles/index.ts)
(shared by the desktop import and the CLI's `--profile` flag so both agree).

```json
{
  "schema": "openready.profile.v1",
  "name": "Acme Frontend Team",
  "categoryWeights": { "documentation": 1.5, "testing-ci": 2 },
  "thresholds": { "failUnder": 70 },
  "role": "frontend",
  "enabledPacks": ["Acme Checks"]
}
```

`categoryWeights` accepts the eight score categories (`documentation`,
`presentation`, `buildability`, `maintainability`, `testing-ci`,
`deployment-operations`, `metadata-discoverability`, `security`) mapped to numbers
≥ 0; `thresholds.failUnder` must be 0–100.

## CLI integration and CI gating

> Parsed today, enforced once the Phase 16 CLI wiring lands — see the status note at
> the top.

| Flag                   | Purpose                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `--plugins <path>`     | Load a pack from a file or directory. Repeatable. Requires `--allow-plugins`.                 |
| `--allow-plugins`      | Explicit consent to execute third-party pack code.                                            |
| `--profile <path>`     | Apply a `openready.profile.v1` JSON file.                                                     |
| `--fail-under <n>`     | Fail the run if any analyzed repository scores below `n` (0–100).                             |
| `--require-check <id>` | Fail the run unless the custom check `id` exists and passes for every repository. Repeatable. |

The gate itself is a pure evaluator
([`src/cli/gating.ts`](../src/cli/gating.ts)):

- `--fail-under` compares each repository's total score; repositories with a `null`
  score (not enough data) never trip the score gate.
- `--require-check` fails when the check is missing **or** when its status is anything
  other than `passed`.
- Every violation produces a human-readable reason naming the repository.

When custom checks run, each repository in the JSON export
(`openready.export.v1`) gains an additive `customChecks` array — existing consumers
are unaffected.

## Implementation pointers

- `src/modules/check-plugins/types.ts` — `CheckPlugin`, `CheckContext`, `CheckPack`, result types
- `src/modules/check-plugins/snapshot.ts` — snapshot builder + context helpers (glob matcher)
- `src/modules/check-plugins/run.ts` — runner with id/status validation and evidence clipping
- `src/modules/check-plugins/loadNode.ts` — Node-only pack loader (CLI / CI)
- `src/modules/check-plugins/official/` — bundled reference pack
- `src/modules/profiles/index.ts` — profile parser shared by desktop and CLI
- `src/cli/gating.ts` — pure gate evaluator
- `schemas/openready.pack.v1.schema.json`, `schemas/openready.profile.v1.schema.json` — manifest and profile contracts
