param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string] $File
)

$ErrorActionPreference = "Stop"

if ($env:OPENREADY_WINDOWS_SIGNING_ENABLED -ne "true") {
  Write-Host "Windows signing disabled; leaving artifact unsigned: $File"
  exit 0
}

$requiredVariables = @(
  "AZURE_CLIENT_ID",
  "AZURE_CLIENT_SECRET",
  "AZURE_TENANT_ID",
  "AZURE_ARTIFACT_SIGNING_ENDPOINT",
  "AZURE_ARTIFACT_SIGNING_ACCOUNT",
  "AZURE_ARTIFACT_SIGNING_CERTIFICATE_PROFILE"
)

$missingVariables = @(
  foreach ($name in $requiredVariables) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) {
      $name
    }
  }
)

if ($missingVariables.Count -gt 0) {
  throw "Windows signing is enabled, but these environment variables are missing: $($missingVariables -join ', ')"
}

$tool = Get-Command trusted-signing-cli -ErrorAction SilentlyContinue

if (-not $tool) {
  throw "trusted-signing-cli was not found. Install it with: cargo install artifact-signing-cli --locked"
}

$description = $env:AZURE_ARTIFACT_SIGNING_DESCRIPTION

if ([string]::IsNullOrWhiteSpace($description)) {
  $description = "OpenReady"
}

$arguments = @(
  "-e",
  $env:AZURE_ARTIFACT_SIGNING_ENDPOINT,
  "-a",
  $env:AZURE_ARTIFACT_SIGNING_ACCOUNT,
  "-c",
  $env:AZURE_ARTIFACT_SIGNING_CERTIFICATE_PROFILE,
  "-d",
  $description,
  $File
)

Write-Host "Signing Windows artifact: $File"
& $tool.Source @arguments

if ($LASTEXITCODE -ne 0) {
  throw "trusted-signing-cli failed with exit code $LASTEXITCODE"
}
