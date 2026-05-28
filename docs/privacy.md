# Privacy model

Today (Phase 8):

- The app stores the theme preference and recent public analysis cache metadata locally.
- The user-entered GitHub username is sent to `api.github.com`.
- GitHub returns public repository metadata for that user.
- OpenReady fetches README content for the first 30 fetched repositories.
- OpenReady fetches repository file-tree paths for the first 30 fetched repositories.
- Fetched repository metadata, README content, file-tree paths and analysis results may be cached locally for recent analyses and can be cleared from Settings.
- Optional GitHub tokens are stored in the operating system credential store and are never stored in browser `localStorage`.
- Stored GitHub tokens are used only for requests to `api.github.com`.
- Exports are generated locally and written only to a file path selected by the user in the desktop save dialog.

Planned later:

- Public GitHub REST API calls only.
- Repository contents are not uploaded anywhere.
- Any future AI integration is opt-in, bring-your-own-key, and content visibility is explicit.

See `openready_master_plan.md` §15.
