# Auto-updater

## Current state: wired, inert

Phase 20 registered `tauri-plugin-updater` so the plumbing exists, but the
updater does nothing yet:

- `src-tauri/tauri.conf.json` → `plugins.updater` has **no endpoints and no
  pubkey**, and `bundle.createUpdaterArtifacts` is `false`.
- No updater keypair exists; releases ship no `.sig` files and no
  `latest.json`.
- The frontend has no `@tauri-apps/plugin-updater` dependency and makes no
  update checks.

With zero endpoints the plugin is inert at runtime — checking for updates is
impossible, and nothing phones home. Flipping it on is configuration, not
code.

## Enabling it (runbook)

Work through these in order. Steps 1–2 are one-time key custody; the rest is
config.

1. **Generate the updater keypair** (one time, on a trusted machine):

   ```bash
   pnpm tauri signer generate -w ~/.tauri/openready.key
   ```

   This prints a public key and writes the password-protected private key.
   The private key signs every future update — treat it like a production
   credential.

2. **Store the private key**: add GitHub Actions secrets
   `TAURI_SIGNING_PRIVATE_KEY` (file contents) and
   `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. Keep an offline escrow copy. Never
   commit either. Losing the key means shipped apps can never accept another
   update — users would have to reinstall manually.

3. **Flip the config** in `src-tauri/tauri.conf.json`:

   ```json
   "bundle": { "createUpdaterArtifacts": true },
   "plugins": {
     "updater": {
       "endpoints": [
         "https://github.com/magnu1102/OpenReady/releases/latest/download/latest.json"
       ],
       "pubkey": "<the public key from step 1>"
     }
   }
   ```

4. **Pass the secrets to the release workflow**: in
   `.github/workflows/release.yml`, add to the `tauri-action` step's `env`:

   ```yaml
   TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
   TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
   ```

   With `createUpdaterArtifacts: true`, tauri-action then attaches `.sig`
   files and a `latest.json` manifest to the release.

5. **Add the frontend flow**: `pnpm add @tauri-apps/plugin-updater`, then a
   check/download/install call — the natural home is a "Check for updates"
   row in Settings, with an optional startup check behind a preference.
   Copy follows `docs/voice-and-tone.md`; strings live in `src/lib/copy.ts`.

6. **Test an update end-to-end** before announcing: install version N,
   publish version N+1, launch N and confirm the prompt, the download, the
   signature verification, and the relaunch.

## Caveats

- The `latest.json` endpoint serves the **published** latest release — draft
  releases are invisible to it, which fits the existing draft-then-publish
  flow in [`releasing.md`](releasing.md).
- Version comparison is SemVer; pre-release suffixes are ignored by the
  default comparator.
- Updater signatures are separate from OS code signing. An unsigned app that
  auto-updates still triggers Gatekeeper/SmartScreen friction — enable this
  together with, or after, code signing (see [`signing.md`](signing.md)).
