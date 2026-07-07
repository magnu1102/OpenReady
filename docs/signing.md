# Signing notes

OpenReady's pre-1.0 releases ship **unsigned and unnotarized**. The release workflow builds the Tauri bundles on GitHub-hosted runners and uploads them straight to the draft release — no Apple Developer ID, no Windows code-signing certificate, and no notarisation step. This is deliberate while the project is finding its feet; signing belongs to a later phase once the project budget supports the recurring cert costs.

This page tells users what to expect on each OS and how to verify a downloaded asset.

## What users will see

### macOS

Opening the `.dmg` or the installed `.app` produces:

> **"OpenReady.app" cannot be opened because the developer cannot be verified.**

There are two ways past it:

1. **Right-click → Open** the app once. macOS then offers an "Open" button in the same dialog. Subsequent launches behave normally.
2. **System Settings → Privacy & Security → Open Anyway** after the first failed double-click.

For pure CLI use (the `openready-cli-<version>.mjs` asset), Gatekeeper is not involved — you run it with your own `node`.

### Windows

The `.msi` installer triggers SmartScreen:

> **Windows protected your PC. Microsoft Defender SmartScreen prevented an unrecognized app from starting.**

Click **More info → Run anyway** once. The warning is normal for unsigned installers; SmartScreen learns the binary over time but never trusts unsigned executables outright.

### Linux

The `.deb` and `.AppImage` artifacts have no built-in signing UX. `.AppImage` requires the executable bit:

```bash
chmod +x OpenReady_*_amd64.AppImage
./OpenReady_*_amd64.AppImage
```

`.deb` installs with `sudo apt install ./open-ready_*_amd64.deb`.

## Verifying an asset

Every release attaches per-file SHA256 checksums (printed in the release body by `tauri-action`). To verify locally:

```bash
shasum -a 256 -c OpenReady_0.1.0_universal.dmg.sha256       # macOS
sha256sum -c OpenReady_0.1.0_x64_en-US.msi.sha256           # Linux / Windows (WSL)
certutil -hashfile OpenReady_0.1.0_x64_en-US.msi SHA256     # Windows PowerShell
```

If the hash matches the value published with the release, the binary was not tampered with after the workflow uploaded it. The GitHub Actions logs are public, so anyone can audit how an asset was built — that's the substitute for code signing while the project is unsigned.

## Signing checklist (when the time comes)

The concrete steps, macOS first — it has the worst unsigned UX and the most
mechanical path.

### macOS: sign + notarize

1. Join the Apple Developer Program (individual is fine; ~$99/year).
2. In the developer portal, create a **Developer ID Application** certificate; export it with its key as a `.p12`.
3. Add GitHub Actions secrets: `APPLE_CERTIFICATE` (base64 of the .p12), `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY` (the cert's common name), `APPLE_ID`, `APPLE_PASSWORD` (an app-specific password), `APPLE_TEAM_ID`.
4. Pass all six as `env` to the `tauri-action` step in `release.yml` — it signs, notarizes via `notarytool`, and staples automatically.
5. Verify a shipped artifact: `codesign --verify --deep OpenReady.app`, `spctl -a -t exec -vv OpenReady.app`, `xcrun stapler validate OpenReady.app`.

### Windows

Pick one:

- **Azure Trusted Signing** (recommended): subscription-based, no cert file custody; wire via `bundle.windows.signCommand` in `tauri.conf.json`.
- **OV certificate**: cheapest cert-file route, but SmartScreen reputation builds slowly per binary.
- **EV certificate**: immediate SmartScreen trust, hardware token custody.

Configure via `bundle.windows.certificateThumbprint` (cert in the runner's store) or `signCommand` (external tool like `AzureSignTool`).

### Linux

No OS-level signing convention. Keep publishing SHA256 checksums; consider a GPG-signed checksum file if requested.

### Interlock with the updater

Updater signatures ([`updater.md`](updater.md)) are a separate keypair from OS code signing — enabling auto-updates without OS signing still leaves Gatekeeper/SmartScreen friction on first install, so plan them together: signing first, updater immediately after.

## When signing will land

Tracked under master plan §13 / Phase 20 (distribution hardening), which also covers the notarization checklist groundwork. Signing will be added once:

- The project has a stable home for the Apple Developer ID and Windows code-signing cert,
- Secrets management for those keys is in place (GitHub Actions encrypted secrets + hardware-backed escrow), and
- A version-controlled doc captures the renewal cadence.

Until then, please use the checksum verification described above and the OS-specific bypasses to run the unsigned bundles. The deterministic core of OpenReady never phones home, so the privacy posture is unchanged regardless of signing status — see [`privacy.md`](privacy.md).
