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
import { runBadge } from "./badge";

const HELP = `openready — deterministic GitHub repository analysis

Usage:
  openready analyze <username> [options]
  openready badge --from <report.json> [options]
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

Options (badge):
  --from <path>                    JSON report from \`analyze --format json\`
  --repo <name>                    Badge a single repository from the report
                                   (default: average across repositories)
  --format <endpoint|svg>          shields.io endpoint JSON or a static SVG
                                   (default: endpoint)
  --label <text>                   Badge label text (default: openready)
  --out <path>                     Write the badge to a file instead of stdout

Examples:
  openready analyze octocat
  openready analyze octocat --format json --out report.json
  openready analyze octocat --repo Hello-World --no-tree
  openready analyze octocat --fail-under 70 --profile team.json
  openready analyze octocat --plugins ./acme-pack --allow-plugins \\
    --require-check acme/has-changelog
  openready badge --from report.json --format svg --out badge.svg

Install:
  npm install -g openready         then: openready analyze octocat
  npx openready analyze octocat    one-off, no install

Running from a source checkout:
  pnpm cli -- analyze octocat
  node dist-cli/openready.mjs analyze octocat
`;

// Injected by the esbuild define in scripts/build-cli.mjs; undefined when
// running the TypeScript source directly via tsx.
declare const __CLI_VERSION__: string | undefined;

function readVersion(): string {
  // Bundle path: esbuild constant-folds this branch and drops the fs read.
  if (typeof __CLI_VERSION__ === "string") return __CLI_VERSION__;
  try {
    // Dev via `tsx src/cli/index.ts` — the source layout makes this exact.
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(resolve(here, "../../package.json"), "utf8")) as {
      version?: string;
    };
    if (typeof pkg.version === "string") return pkg.version;
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
    case "badge": {
      const { exitCode } = await runBadge(command);
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
