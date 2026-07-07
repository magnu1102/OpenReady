# Privacy model

OpenReady is local-first. The deterministic analyzer runs on the user's machine. Only public GitHub REST API endpoints are contacted, and only on explicit user request.

## What happens today

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

### AI assist (opt-in)

- Off by default. Nothing is sent to any AI provider unless a key is configured in Settings **and** a suggestion is explicitly requested from a panel.
- The API key is stored in the operating system credential store, never in browser `localStorage`.
- When a suggestion is requested, the prompt contains the repository context shown in that panel (metadata, check results, README content already fetched from GitHub) and goes only to the configured OpenAI-compatible base URL.
- Requests to non-local providers require a key; local providers (`localhost`) may run keyless.

### CLI

- The CLI (`openready analyze <username>`) runs the same analyzer locally, in a Node process. No telemetry.
- Tokens come from `--token`, then `OPENREADY_GITHUB_TOKEN`, then `GITHUB_TOKEN`. The CLI does **not** read the OS credential store — tokens are passed via flag or environment so script and CI usage stay explicit.
- `--out` writes to a path the caller provides; without `--out`, output goes to stdout.
- The CLI never persists analysis snapshots to disk on its own. Reusing the same desktop cache is intentionally out of scope.

## Planned later

- Private repository support — opt-in, with privacy implications made clear.

See `openready_master_plan.md` §15.
