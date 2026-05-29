# Releasing

Cutting a release of OpenReady is a short manual checklist that hands off the heavy lifting (cross-platform Tauri builds, draft Release creation, CLI bundle upload) to the `release.yml` workflow.

## Versioning policy

- SemVer, [as documented](https://semver.org/spec/v2.0.0.html). While the project is pre-1.0, breaking changes can appear in any `0.x` bump and **must** be called out in `CHANGELOG.md`.
- One version string lives in four places: `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and the dated heading in `CHANGELOG.md`. They are kept in lockstep by `pnpm bump:version <new-version>`.
- Tags use the `v` prefix: `v0.1.0`, `v0.2.0-beta.1`. The release workflow trigger expects exactly that pattern.

## Checklist

1. **Pre-flight on `main`.**

   ```bash
   git checkout main
   git pull --ff-only
   pnpm install --frozen-lockfile
   pnpm lint && pnpm typecheck && pnpm typecheck:cli && pnpm test
   pnpm build && pnpm build:cli
   ```

   The same gates run in `lint-and-test.yml` on every PR — this step is the local sanity check before tagging.

2. **Update the changelog draft.** Edit `CHANGELOG.md` — under `## [Unreleased]`, summarise what's shipping. Keep the Keep-a-Changelog headings (`### Added`, `### Changed`, `### Fixed`, `### Removed`, `### Security`).

3. **Bump version + promote the changelog entry.**

   ```bash
   pnpm bump:version 0.2.0
   git diff   # review
   git commit -am "chore(release): v0.2.0"
   ```

4. **Tag and push.**

   ```bash
   git tag v0.2.0
   git push origin main
   git push origin v0.2.0
   ```

   Pushing the tag triggers `.github/workflows/release.yml`. The workflow runs the macOS / Windows / Linux matrix, drafts a Release named `OpenReady v0.2.0`, and attaches:
   - `OpenReady_0.2.0_universal.dmg` (macOS)
   - `OpenReady_0.2.0_x64_en-US.msi` (Windows)
   - `open-ready_0.2.0_amd64.deb` + `open-ready_0.2.0_amd64.AppImage` (Linux)
   - `openready-cli-0.2.0.mjs` (CLI bundle)

5. **Review the draft.** Open `/releases` on GitHub, verify the asset list, paste the relevant `CHANGELOG.md` section into the release notes if `tauri-action` didn't pick it up, and click **Publish**.

6. **Smoke-test the shipped artifacts.**
   - Download the bundle matching your OS and confirm it launches (you'll see Gatekeeper / SmartScreen — see [`signing.md`](signing.md)).
   - `node openready-cli-0.2.0.mjs --version` prints `openready 0.2.0`.

## Re-running a failed build

The workflow also responds to `workflow_dispatch` with an explicit tag input. Re-running with the same tag updates the existing draft Release in place (tauri-action handles deduplication).

## Hotfix releases

For a hotfix like `v0.1.1` cut off `main`:

```bash
git checkout main
git checkout -b hotfix/0.1.1
# … fixes …
pnpm bump:version 0.1.1
git commit -am "chore(release): v0.1.1"
git push -u origin hotfix/0.1.1
# open + merge PR
git checkout main && git pull --ff-only
git tag v0.1.1 && git push origin v0.1.1
```

## Future work

- Code signing and notarisation (currently deferred — see [`signing.md`](signing.md)).
- Auto-update channel via the Tauri updater.
- `npm publish` of the CLI under the OpenReady scope once the project has a chosen LICENSE — the registry requires one.
