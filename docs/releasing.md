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
   ```

   The script updates the four version locations, promotes `[Unreleased]`, and
   **rebuilds `dist-cli/openready.mjs`** (the bundle embeds its version, and
   CI's drift guard fails if it lags the bump).

4. **Sync `Cargo.lock`.** The bump script rewrites `Cargo.toml` but Cargo only
   refreshes the lockfile on its next invocation — commit them together or the
   `--locked` CI checks fail:

   ```bash
   cargo metadata --manifest-path src-tauri/Cargo.toml --format-version 1 > /dev/null
   git diff   # review — includes Cargo.lock and dist-cli/openready.mjs
   git commit -am "chore(release): v0.2.0"
   ```

5. **Tag and push.**

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

6. **Review the draft.** Open `/releases` on GitHub, verify the asset list, paste the relevant `CHANGELOG.md` section into the release notes if `tauri-action` didn't pick it up, and click **Publish**.

7. **Smoke-test the shipped artifacts.**
   - Download the bundle matching your OS and confirm it launches (you'll see Gatekeeper / SmartScreen — see [`signing.md`](signing.md)).
   - `node openready-cli-0.2.0.mjs --version` prints `openready 0.2.0`.

8. **Publish to npm (manual).** From the tagged, clean checkout:

   ```bash
   npm pack --dry-run   # review the file list: dist-cli/, schemas/*.schema.json, README, LICENSE
   npm pack             # produces openready-<version>.tgz
   # smoke the tarball in a scratch directory:
   #   npm init -y && npm i ../openready-<version>.tgz && npx openready --version
   npm login            # first time only
   npm publish
   npx openready@latest --version   # confirm the registry serves the new version
   ```

## Local build gotcha: MSI rejects pre-release versions

Between releases the tree carries a `-dev` version (for example `0.5.0-dev`).
A local `pnpm tauri build` **fails at the MSI bundling step** on Windows —
WiX requires a numeric `x.y.z` ProductVersion and rejects SemVer pre-release
suffixes. The compile itself succeeds; only the MSI bundler aborts. Options:

- `pnpm tauri build --bundles nsis` (NSIS accepts pre-release suffixes), or
- bump to a clean release version first (the normal release flow), or
- ignore it — the exe under `src-tauri/target/release/` is already built.

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
- Auto-update channel via the Tauri updater (groundwork wired but gated — see [`updater.md`](updater.md)).
- CI-automated `npm publish` (currently a manual checklist step).
