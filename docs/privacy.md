# Privacy model

Today (Phase 6):

- The app stores only the theme preference in `localStorage`.
- The user-entered GitHub username is sent to `api.github.com`.
- GitHub returns public repository metadata for that user.
- OpenReady fetches README content for the first 30 fetched repositories.
- OpenReady fetches repository file-tree paths for the first 30 fetched repositories.
- Fetched repository metadata, README content, file-tree paths and analysis results are kept in memory only and are cleared when the app restarts.
- No GitHub token is requested or stored.

Planned later:

- Public GitHub REST API calls only.
- Optional GitHub token is stored locally and never sent anywhere except `api.github.com`.
- Repository contents are not uploaded anywhere.
- Any future AI integration is opt-in, bring-your-own-key, and content visibility is explicit.

See `openready_master_plan.md` §15.
