# github-client

Public GitHub REST API client. Handles fetching user repositories, repository contents, README/workflow files, rate limits and optional token authentication.

**Phase:** public repository listing implemented in Phase 2.

**Public surface:** `fetchUserRepositories(username)`.

Current behavior:

- Fetches the first 100 public repositories for a GitHub user.
- Sorts repositories by most recently pushed.
- Uses unauthenticated public GitHub REST API requests.
- Maps GitHub responses into OpenReady's internal `Repository` type.
- Returns structured errors for invalid usernames, missing users, rate limits, network failure and unexpected API responses.

Not implemented yet:

- Repository contents, README, license or workflow fetching.
- Optional token authentication.
- Organization repository listing.
- Caching or persistence.

Local-first: no caching or persistence in this module — that lives in app state and later cache modules.
