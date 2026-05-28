# Privacy model

OpenReady is local-first. The deterministic analyzer runs on the user's machine. Only public GitHub REST API endpoints are contacted, and only on explicit user request.

## What happens today (Phase 11)

### Desktop app

- Stores the theme preference, the four-step tour "seen" flag, and recent public analysis cache metadata locally.
- Sends the user-entered GitHub username to `api.github.com`.
- GitHub returns public repository metadata for that user.
- Fetches README content for the first 30 fetched repositories.
- Fetches repository file-tree paths for the first 30 fetched repositories.
- Project classification (Phase 9) runs locally on the file tree and metadata that was already fetched — no new network calls.
- Fetched repository metadata, README content, file-tree paths, classifications, classification overrides, and analysis results may be cached locally for recent analyses and can be cleared from Settings.
- Optional GitHub tokens are stored in the operating system credential store and are never stored in browser `localStorage`.
- Stored GitHub tokens are used only for requests to `api.github.com`.
- Exports are generated locally and written only to a file path selected by the user in the desktop save dialog.

### CLI

- The CLI (`openready analyze <username>`) runs the same analyzer locally, in a Node process. No telemetry.
- Tokens come from `--token`, then `OPENREADY_GITHUB_TOKEN`, then `GITHUB_TOKEN`. The CLI does **not** read the OS credential store — tokens are passed via flag or environment so script and CI usage stay explicit.
- `--out` writes to a path the caller provides; without `--out`, output goes to stdout.
- The CLI never persists analysis snapshots to disk on its own. Reusing the same desktop cache is intentionally out of scope.

## Planned later

- Optional opt-in AI integrations (master plan §10 and Phase 15) — bring-your-own-key, with explicit visibility into what content would be sent before any call is made.
- Private repository support — opt-in, with privacy implications made clear.

See `openready_master_plan.md` §15.
