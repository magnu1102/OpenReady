# Signing notes

OpenReady's pre-1.0 releases have shipped unsigned and unnotarized. That is
acceptable for early development, but it means Windows users see Microsoft
Defender SmartScreen and macOS users see Gatekeeper warnings.

This page describes the current behavior and the path to signed releases.
Windows guidance is current as of 2026-07-07 and follows Microsoft's current
SmartScreen and code-signing documentation.

## What users will see

### macOS

Opening the `.dmg` or installed `.app` can produce:

> "OpenReady.app" cannot be opened because the developer cannot be verified.

There are two ways past it:

1. Right-click the app and choose **Open** once. macOS then offers an **Open**
   button in the same dialog. Later launches behave normally.
2. Open **System Settings -> Privacy & Security -> Open Anyway** after the
   first failed double-click.

For pure CLI use, Gatekeeper is not involved because users run the
`openready-cli-<version>.mjs` asset with their own `node`.

### Windows

Unsigned `.msi` or `.exe` installers trigger SmartScreen:

> Windows protected your PC. Microsoft Defender SmartScreen prevented an
> unrecognized app from starting.

Unsigned installers show **Publisher: Unknown publisher**. Users can click
**More info -> Run anyway** unless their organization blocks bypasses.

Signing changes the publisher from **Unknown publisher** to the validated
person or organization name. It does not guarantee that SmartScreen disappears
immediately. Microsoft evaluates both publisher reputation and file-hash
reputation; new signed binaries can still be marked "unrecognized" until the
publisher identity or file builds enough clean download history.

### Linux

The `.deb` and `.AppImage` artifacts have no common OS-level signing UX.
`.AppImage` requires the executable bit:

```bash
chmod +x OpenReady_*_amd64.AppImage
./OpenReady_*_amd64.AppImage
```

`.deb` installs with:

```bash
sudo apt install ./open-ready_*_amd64.deb
```

## Verifying an asset

Every release should publish per-file SHA256 checksums. To verify locally:

```bash
shasum -a 256 -c OpenReady_0.5.0_universal.dmg.sha256       # macOS
sha256sum -c OpenReady_0.5.0_x64_en-US.msi.sha256           # Linux / Windows with WSL
certutil -hashfile OpenReady_0.5.0_x64-setup.exe SHA256     # Windows PowerShell
```

If the hash matches the value published with the release, the binary was not
modified after the workflow uploaded it. Public GitHub Actions logs remain
useful audit evidence, but checksums are not a substitute for OS code signing.

## Windows signing plan

For direct GitHub Release downloads, use Authenticode signing through Tauri's
`bundle.windows.signCommand`.

Preferred route:

1. Create an Azure Artifact Signing account.
2. Complete Microsoft identity validation.
3. Create a certificate profile.
4. Grant the signing identity the required certificate-profile signer role.
5. Store the signing values in GitHub Actions secrets and variables.
6. Build Windows releases through the existing `release.yml` workflow.

Azure Artifact Signing is Microsoft's recommended non-Store option. It is
CI-friendly and avoids custody of a local certificate file or hardware token,
but SmartScreen reputation still builds over time.

Required GitHub repository variables:

- `WINDOWS_SIGNING_ENABLED`: set to `true` to activate signing.
- `AZURE_ARTIFACT_SIGNING_ENDPOINT`: region endpoint, for example
  `https://weu.codesigning.azure.net`.
- `AZURE_ARTIFACT_SIGNING_ACCOUNT`: Azure Artifact Signing account name.
- `AZURE_ARTIFACT_SIGNING_CERTIFICATE_PROFILE`: certificate profile name.
- `AZURE_ARTIFACT_SIGNING_DESCRIPTION`: optional; defaults to `OpenReady`.

Required GitHub repository secrets:

- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `AZURE_TENANT_ID`

When `WINDOWS_SIGNING_ENABLED` is not `true`, the signing hook exits without
modifying the artifact so local and unsigned CI builds can continue.

## Certificate choices

- **Azure Artifact Signing**: recommended for non-Store distribution where it is
  available. It costs much less than traditional certificates, integrates with
  CI, and does not require a USB token.
- **OV certificate**: a traditional CA-issued code-signing certificate. It is
  useful when Azure Artifact Signing is unavailable or when a customer requires
  a specific CA chain. SmartScreen reputation still builds over time.
- **EV certificate**: still valid for signing, but no longer worth buying solely
  for SmartScreen. Microsoft documents that EV certificates no longer bypass
  SmartScreen automatically; EV-signed binaries follow the same reputation model
  as OV-signed binaries.
- **Self-signed certificate**: only for local development, test machines, or
  managed enterprise fleets that deploy the root certificate. Do not use this
  for public downloads.

The cleanest Windows UX is Microsoft Store distribution. Store MSIX packages are
re-signed by Microsoft. Store-submitted MSI/EXE installers still need
publisher-side Authenticode signing before submission.

## macOS signing plan

1. Join the Apple Developer Program.
2. Create a Developer ID Application certificate and export it with its private
   key as a `.p12`.
3. Add GitHub Actions secrets: `APPLE_CERTIFICATE`,
   `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`,
   `APPLE_PASSWORD`, and `APPLE_TEAM_ID`.
4. Pass those values to the `tauri-action` step. Tauri signs, notarizes with
   `notarytool`, and staples automatically.
5. Verify a shipped artifact:

```bash
codesign --verify --deep OpenReady.app
spctl -a -t exec -vv OpenReady.app
xcrun stapler validate OpenReady.app
```

## Interlock with the updater

Tauri updater signatures are separate from OS code signing. Enabling updater
artifacts without OS signing still leaves Gatekeeper and SmartScreen friction
on first install, so plan code signing first and updater signing immediately
afterward.
