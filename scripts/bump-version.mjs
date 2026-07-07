#!/usr/bin/env node
/**
 * Bump the project version across every place that stores it:
 *   - package.json#version
 *   - src-tauri/tauri.conf.json#version
 *   - src-tauri/Cargo.toml [package]/version
 *   - CHANGELOG.md "## [Unreleased]" heading -> "## [<version>] — <YYYY-MM-DD>"
 *
 * Usage:
 *   node scripts/bump-version.mjs <new-version>
 *
 * The script fails loudly if any file is missing its expected pattern, so a
 * partial bump is never silently committed. Cargo.lock regenerates on the next
 * `cargo` invocation (Tauri build), so it is intentionally not rewritten here.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

function fail(message) {
  process.stderr.write(`bump-version: ${message}\n`);
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv[2]);
}

function main(version) {
  if (!version) {
    fail("expected a target version, e.g. `node scripts/bump-version.mjs 0.1.1`");
  }
  if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version)) {
    fail(`"${version}" is not a SemVer 0.x or higher (expected MAJOR.MINOR.PATCH[-prerelease])`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const edits = [
    {
      path: resolve(root, "package.json"),
      transform: (content) => replaceJsonField(content, "version", version),
    },
    {
      path: resolve(root, "src-tauri/tauri.conf.json"),
      transform: (content) => replaceJsonField(content, "version", version),
    },
    {
      path: resolve(root, "src-tauri/Cargo.toml"),
      transform: (content) =>
        replaceWithPattern(
          content,
          /^version\s*=\s*"[^"]+"/m,
          `version = "${version}"`,
          "Cargo.toml [package] version",
        ),
    },
    {
      path: resolve(root, "CHANGELOG.md"),
      transform: (content) => promoteUnreleased(content, version, today),
    },
  ];

  for (const edit of edits) {
    const original = readFileSync(edit.path, "utf8");
    const next = edit.transform(original);
    if (next === original) {
      fail(`no change applied to ${edit.path} - pattern may have drifted, check manually`);
    }
    writeFileSync(edit.path, next);
    process.stdout.write(`updated ${edit.path}\n`);
  }

  // The committed CLI bundle embeds the version (esbuild define in
  // build-cli.mjs), so a bump without a rebuild would trip the CI drift guard.
  // Rebuild here so the invariant is mechanical, not operator memory.
  process.stdout.write("\nRebuilding dist-cli/openready.mjs with the new version...\n");
  execFileSync(process.execPath, [resolve(here, "build-cli.mjs")], { stdio: "inherit" });

  process.stdout.write("\nNext steps:\n");
  process.stdout.write("  git diff           # review (includes dist-cli/openready.mjs)\n");
  process.stdout.write(`  git commit -am "chore(release): v${version}"\n`);
  process.stdout.write(`  git tag v${version}\n`);
  process.stdout.write("  git push && git push --tags\n");
}

function replaceJsonField(content, field, value) {
  const pattern = new RegExp(`("${field}"\\s*:\\s*)"[^"]+"`, "");
  if (!pattern.test(content)) {
    fail(`expected to find a "${field}" field`);
  }
  return content.replace(pattern, `$1"${value}"`);
}

function replaceWithPattern(content, pattern, replacement, label) {
  if (!pattern.test(content)) {
    fail(`expected to find ${label}`);
  }
  return content.replace(pattern, replacement);
}

export function promoteUnreleased(content, nextVersion, date) {
  const heading = "## [Unreleased]";
  if (!content.includes(heading)) {
    fail("CHANGELOG.md does not contain an [Unreleased] section");
  }
  const newHeader = `## [Unreleased]\n\n_No changes yet._\n\n## [${nextVersion}] — ${date}`;
  const next = content.replace(heading, newHeader);

  // Refresh the compare/tag link anchors at the bottom of the file if present.
  // This is line-based to avoid regex backtracking on malformed changelog text.
  return refreshReleaseAnchors(next, nextVersion);
}

function refreshReleaseAnchors(content, nextVersion) {
  const lineBreak = content.includes("\r\n") ? "\r\n" : "\n";
  const trailingNewline = /\r?\n$/.test(content);
  const lines = content.split(/\r?\n/);
  if (trailingNewline) lines.pop();

  let anchorStart = lines.length;
  while (anchorStart > 0 && isReleaseAnchorLine(lines[anchorStart - 1])) {
    anchorStart -= 1;
  }

  if (anchorStart === lines.length) return content;

  const anchorLines = lines.slice(anchorStart);
  const unreleasedLine = anchorLines.find((line) => line.startsWith("[Unreleased]:"));
  if (!unreleasedLine) return content;

  const repo = extractGitHubRepo(unreleasedLine);
  const updated = [
    `[Unreleased]: https://github.com/${repo}/compare/v${nextVersion}...HEAD`,
    `[${nextVersion}]: https://github.com/${repo}/releases/tag/v${nextVersion}`,
  ];

  for (const line of anchorLines) {
    if (line.startsWith("[Unreleased]:")) continue;
    if (line.startsWith(`[${nextVersion}]:`)) continue;
    updated.push(line);
  }

  return (
    [...lines.slice(0, anchorStart), ...updated].join(lineBreak) +
    (trailingNewline ? lineBreak : "")
  );
}

function isReleaseAnchorLine(line) {
  if (!line.startsWith("[")) return false;
  const markerIndex = line.indexOf("]:");
  if (markerIndex < 2) return false;
  return line
    .slice(markerIndex + 2)
    .trimStart()
    .startsWith("https://");
}

function extractGitHubRepo(line) {
  const prefix = "https://github.com/";
  const start = line.indexOf(prefix);
  if (start < 0) return "OWNER/REPO";

  const parts = line.slice(start + prefix.length).split("/");
  if (parts.length < 2 || !parts[0] || !parts[1]) return "OWNER/REPO";

  return `${parts[0]}/${parts[1]}`;
}
