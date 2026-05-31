# check-plugins

Custom, third-party checks that run on top of OpenReady's deterministic core. Custom
checks are **informational** — they appear in their own surface and never change the
built-in 0–100 score.

## Trust model (read this first)

A check pack is **third-party JavaScript**. You trust it the same way you trust an
installed npm devDependency. OpenReady reduces the blast radius but does not pretend to
fully sandbox arbitrary code:

- Nothing runs until you **import a pack and enable it**. Off by default.
- The desktop app runs packs inside a **Web Worker that is terminated on timeout**,
  off the main thread. The worker is handed only a serializable snapshot — no DOM, no
  app state, no GitHub token or API keys, no Tauri handles.
- A throwing or malformed check becomes an `unknown` result; it can never crash analysis.
- Nothing is sent off your machine.

Only import packs you have read or trust. In CI, plugins load only when you pass
`--allow-plugins`.

## Authoring a check

A check is an object implementing `CheckPlugin`:

```ts
import type { CheckPlugin } from "openready/check-plugins";

export const hasChangelog: CheckPlugin = {
  id: "acme/has-changelog", // must be "vendor/check-name"
  label: "Repository ships a CHANGELOG",
  category: "documentation", // optional; defaults to "custom"
  run: (ctx) => ({
    status: ctx.hasPath("CHANGELOG*") ? "passed" : "failed",
    evidence: ctx.hasPath("CHANGELOG*") ? undefined : "No CHANGELOG file found.",
  }),
};
```

`run` receives a read-only `CheckContext` and returns `{ status, evidence? }` where
`status` is `passed | failed | not-applicable | unknown`.

### Context helpers

- `ctx.repository` — repository metadata (name, topics, language, stars, …).
- `ctx.readme` — `{ found, content }`.
- `ctx.tree` — `{ available, truncated, paths }`.
- `ctx.techSignals` — detected stack signals.
- `ctx.hasPath(glob | RegExp)` — match committed file paths (`*` within a segment, `**` across).
- `ctx.readmeMatches(RegExp)` — test the README body.
- `ctx.hasTopic(name)` — case-insensitive topic membership.

## Packs

A pack bundles a manifest (`schemas/openready.pack.v1.schema.json`) with its checks:

```ts
export const pack: CheckPack = {
  manifest: {
    schema: "openready.pack.v1",
    name: "Acme Checks",
    version: "1.0.0",
    checkIds: ["acme/has-changelog"],
  },
  checks: [hasChangelog],
};
```

See [`official/`](./official) for the bundled reference pack. Distribution is by local
file import (or the bundled official pack) — there is no remote registry.
