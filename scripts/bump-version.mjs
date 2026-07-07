#!/usr/bin/env node
/**
 * Bump the project version across every place that stores it:
 *   - package.json#version
 *   - src-tauri/tauri.conf.json#version
 *   - src-tauri/Cargo.toml [package]/version
 *   - CHANGELOG.md "## [Unreleased]" heading → "## [<version>] — <YYYY-MM-DD>"
 *
 * Usage:
 *   node scripts/bump-version.mjs <new-version>
 *
 * The script fails loudly if any file is missing its expected pattern, so a
 * partial bump is never silently committed. Cargo.lock regenerates on the next
 * `cargo` invocation (Tauri build), so it is intentionally not rewritten here.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

function fail(message) {
  process.stderr.write(`bump-version: ${message}\n`);
  process.exit(1);
}

const version = process.argv[2];
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
    fail(`no change applied to ${edit.path} — pattern may have drifted, check manually`);
  }
  writeFileSync(edit.path, next);
  process.stdout.write(`updated ${edit.path}\n`);
}

// The committed CLI bundle embeds the version (esbuild define in
// build-cli.mjs), so a bump without a rebuild would trip the CI drift guard.
// Rebuild here so the invariant is mechanical, not operator memory.
process.stdout.write(`\nRebuilding dist-cli/openready.mjs with the new version…\n`);
execFileSync(process.execPath, [resolve(here, "build-cli.mjs")], { stdio: "inherit" });

process.stdout.write(`\nNext steps:\n`);
process.stdout.write(`  git diff           # review (includes dist-cli/openready.mjs)\n`);
process.stdout.write(`  git commit -am "chore(release): v${version}"\n`);
process.stdout.write(`  git tag v${version}\n`);
process.stdout.write(`  git push && git push --tags\n`);

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

function promoteUnreleased(content, nextVersion, date) {
  const heading = "## [Unreleased]";
  if (!content.includes(heading)) {
    fail("CHANGELOG.md does not contain an [Unreleased] section");
  }
  const newHeader = `## [Unreleased]\n\n_No changes yet._\n\n## [${nextVersion}] — ${date}`;
  let next = content.replace(heading, newHeader);

  // Refresh the compare/tag link anchors at the bottom of the file if present.
  const anchorBlock = /\[Unreleased\]:[^\n]*\n(\[[^\]]+\]:[^\n]*\n?)*$/m;
  if (anchorBlock.test(next)) {
    next = next.replace(anchorBlock, (block) => {
      const lines = block.trim().split("\n");
      const repoMatch = lines[0]?.match(/https:\/\/github\.com\/([^/]+\/[^/]+)/);
      const repo = repoMatch ? repoMatch[1] : "OWNER/REPO";
      const updated = [
        `[Unreleased]: https://github.com/${repo}/compare/v${nextVersion}...HEAD`,
        `[${nextVersion}]: https://github.com/${repo}/releases/tag/v${nextVersion}`,
      ];
      for (const line of lines.slice(1)) {
        if (line.startsWith(`[${nextVersion}]:`) || line.startsWith("[Unreleased]:")) continue;
        updated.push(line);
      }
      return updated.join("\n") + "\n";
    });
  }

  return next;
}
