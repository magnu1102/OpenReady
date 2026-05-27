# Privacy model

Stub — expanded as features land.

Today (Phase 1):

- The app stores only the theme preference in `localStorage`.
- No network calls are made.

Phase 2 and beyond:

- Public GitHub REST API calls only.
- Optional GitHub token is stored locally and never sent anywhere except `api.github.com`.
- Repository contents are not uploaded.
- Any future AI integration is opt-in, bring-your-own-key, and content visibility is explicit.

See master plan §15.
