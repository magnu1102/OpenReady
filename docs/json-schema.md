# JSON schemas

OpenReady publishes versioned [JSON Schema](https://json-schema.org/) (draft 2020-12)
documents under [`schemas/`](../schemas) so other tools can produce and consume its
data with confidence. Each schema is identified by a `schema` discriminator field and
is a stable contract: breaking changes get a new version (`...v2`), never a silent edit.

## `openready.export.v1`

Describes the JSON emitted by `openready analyze --format json` and the desktop JSON
export (`exportJsonSummary` in `src/modules/export-engine/index.ts`). Top level:

- `schema` — always `"openready.export.v1"`
- `generatedAt`, `username`, `repositoryCount`
- `repositories[]` — per repo: identity/metadata, `healthLabel`, the full `score`
  object (total + per-category breakdown), pass/fail/unknown counts, `missingSignals`,
  the `failedChecks` / `unknownChecks` arrays, and prioritized `recommendations`.

A conformance test (`schemas/schema.test.ts`) validates real `exportJsonSummary` output
against this schema on every run, so the schema can never drift from the code.

## `openready.pack.v1`

The manifest for a [check pack](../src/modules/check-plugins/README.md): `name`,
`version`, optional `author`/`description`, and `checkIds` (namespaced `vendor/check`).
The manifest is data only — the executable checks live alongside it and run under the
explicit-trust model documented in the check-plugins README.

## `openready.profile.v1`

A shareable [team profile](./profiles.md): `categoryWeights`, optional score
`thresholds.failUnder`, an optional target `role`, and the `enabledPacks` names a team
wants on. Imported in the desktop app and consumed by the CLI's `--profile` flag.

## Versioning

- The `schema` field is the contract. Tools should check it before parsing.
- Additive, optional fields may appear within a version; required fields and field
  meanings never change within a version.
- Any breaking change ships as a new `...vN` file and discriminator.
