# github-client

Public GitHub REST API client. Handles fetching user repositories, README files, rate limits and optional token authentication later.

**Phase:** public repository listing implemented in Phase 2, README fetching in Phase 3, and repository tree fetching in Phase 4 for the Phase 6 detail view.

**Public surface:** `fetchUserRepositories(username)`, `fetchRepositoryReadme(owner, repo)`, `fetchRepositoryTree(owner, repo, defaultBranch)`.

Current behavior:

- Fetches the first 100 public repositories for a GitHub user.
- Sorts repositories by most recently pushed.
- Fetches README content for selected repositories.
- Uses unauthenticated public GitHub REST API requests.
- Maps GitHub responses into OpenReady's internal `Repository` type.
- Returns structured errors for invalid usernames, missing users, rate limits, network failure and unexpected API responses.

Not implemented yet:

- Full repository file-tree or workflow fetching.
- Optional token authentication.
- Organization repository listing.
- Caching or persistence.

Local-first: no caching or persistence in this module — that lives in app state and later cache modules.
