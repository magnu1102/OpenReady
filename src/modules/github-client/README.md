# github-client

Public GitHub REST API client. Handles fetching user repositories, repository contents, README/workflow files, rate limits and optional token authentication.

**Phase:** placeholder. Implementation lands in Phase 2.

**Public surface (planned):** `fetchUserRepositories(username, opts)`, `fetchRepositoryDetails(owner, repo, opts)`.

Local-first: no caching or persistence in this module — that lives in app state and (later) the cache module.
