# Security Policy

## Supported versions

OpenReady is pre-1.0 and ships from `main`. Security fixes target the latest release and `main`.
Older tagged releases are not separately maintained.

| Version          | Supported |
| ---------------- | --------- |
| latest (`main`)  | ✅        |
| older `0.x` tags | ❌        |

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately through one of:

1. **GitHub private vulnerability reporting** (preferred) — on this repository, go to the
   **Security** tab → **Report a vulnerability**. This opens a private advisory visible only to
   maintainers.
2. **Email** — `magnus1102@gmail.com`.

Please include steps to reproduce, affected version/commit, and impact. You'll get an
acknowledgement as soon as possible; once a fix ships, we're happy to credit you (with your
permission).

## Security posture

OpenReady is deterministic and local-first by design:

- Repository analysis runs on your machine; repository contents are not sent to any third party.
- No account or login is required, and nothing is persisted to a remote database.
- Optional GitHub tokens are stored in the operating system credential store, **never** in browser
  local storage or the repository.

See [docs/privacy.md](docs/privacy.md) for the full privacy model.
