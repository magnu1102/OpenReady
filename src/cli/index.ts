/**
 * OpenReady CLI entry. The shebang is injected by the esbuild banner in
 * scripts/build-cli.mjs, so the bundled artifact at dist-cli/openready.mjs
 * is directly executable. In dev we run via `tsx`, which doesn't need it.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parseCliArgs } from "./args";
import { runAnalyze } from "./run";

const HELP = `openready — deterministic GitHub repository analysis

Usage:
  openready analyze <username> [options]
  openready --help
  openready --version

Options (analyze):
  --format <table|json|markdown>   Output format (default: table)
  --limit <n>                      Max repositories to analyze (default: 30)
  --repo <name>                    Focus a single repository by name
  --out <path>                     Write output to a file instead of stdout
  --token <value>                  GitHub token (falls back to
                                   OPENREADY_GITHUB_TOKEN, then GITHUB_TOKEN)
  --no-readme                      Skip README fetches
  --no-tree                        Skip file-tree fetches
  --profile <path>                 Apply an openready.profile.v1 JSON file
                                   (category weights, failUnder threshold)
  --plugins <path>                 Load a check pack (file or directory).
                                   Repeatable. Requires --allow-plugins
  --allow-plugins                  Consent to run third-party pack code
  --fail-under <n>                 Exit 4 if any repository scores below n
  --require-check <id>             Exit 4 unless the custom check passes for
                                   every repository. Repeatable

Examples:
  openready analyze octocat
  openready analyze octocat --format json --out report.json
  openready analyze octocat --repo Hello-World --no-tree
  openready analyze octocat --fail-under 70 --profile team.json
  openready analyze octocat --plugins ./acme-pack --allow-plugins \\
    --require-check acme/has-changelog
`;

function readVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    // Walk up to package.json — works both for `src/cli/index.ts` (dev) and
    // the bundled `dist-cli/openready.mjs` (ship).
    for (const candidate of [
      resolve(here, "../../package.json"),
      resolve(here, "../package.json"),
    ]) {
      try {
        const pkg = JSON.parse(readFileSync(candidate, "utf8")) as { version?: string };
        if (pkg.version) return pkg.version;
      } catch {
        // try next candidate
      }
    }
  } catch {
    // fall through
  }
  return "0.0.0";
}

async function main(argv: string[]): Promise<number> {
  const command = parseCliArgs(argv.slice(2));
  switch (command.kind) {
    case "help":
      process.stdout.write(HELP);
      return 0;
    case "version":
      process.stdout.write(`openready ${readVersion()}\n`);
      return 0;
    case "error":
      process.stderr.write(`openready: ${command.message}\n`);
      return 2;
    case "analyze": {
      const { exitCode } = await runAnalyze(command);
      return exitCode;
    }
  }
}

main(process.argv).then(
  (code) => process.exit(code),
  (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`openready: ${message}\n`);
    process.exit(1);
  },
);
