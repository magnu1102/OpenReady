# Privacy model

Stub — expanded as features land.

Today (Phase 2):

- The app stores only the theme preference in `localStorage`.
- The user-entered GitHub username is sent to `api.github.com`.
- GitHub returns public repository metadata for that user.
- Fetched repository metadata is kept in memory only and is cleared when the app restarts.
- No GitHub token is requested or stored.

Phase 3 and beyond:

- Public GitHub REST API calls only.
- Optional GitHub token is stored locally and never sent anywhere except `api.github.com`.
- Repository contents are not uploaded.
- Any future AI integration is opt-in, bring-your-own-key, and content visibility is explicit.

See master plan §15.
