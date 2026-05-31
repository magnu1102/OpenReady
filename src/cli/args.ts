import { parseArgs } from "node:util";

export type OutputFormat = "table" | "json" | "markdown";

export interface AnalyzeArgs {
  kind: "analyze";
  username: string;
  format: OutputFormat;
  limit: number;
  repo: string | null;
  out: string | null;
  token: string | null;
  fetchReadme: boolean;
  fetchTree: boolean;
}

export type ParsedCommand =
  | AnalyzeArgs
  | { kind: "help" }
  | { kind: "version" }
  | { kind: "error"; message: string };

const VALID_FORMATS: OutputFormat[] = ["table", "json", "markdown"];

export function parseCliArgs(argv: string[]): ParsedCommand {
  // Package managers forward a literal `--` separator (e.g. `pnpm cli -- analyze
  // octocat`). Drop a single leading separator so the command is still found.
  const args = argv[0] === "--" ? argv.slice(1) : argv;

  if (args.length === 0) return { kind: "help" };

  // Fast paths for global flags.
  if (args.includes("--help") || args.includes("-h")) return { kind: "help" };
  if (args.includes("--version") || args.includes("-v")) return { kind: "version" };

  const [command, ...rest] = args;

  if (command !== "analyze") {
    return { kind: "error", message: `Unknown command: ${command}. Try \`openready --help\`.` };
  }

  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({
      args: rest,
      options: {
        format: { type: "string" },
        limit: { type: "string" },
        repo: { type: "string" },
        out: { type: "string" },
        token: { type: "string" },
        "no-readme": { type: "boolean" },
        "no-tree": { type: "boolean" },
      },
      allowPositionals: true,
      strict: true,
    });
  } catch (error) {
    return { kind: "error", message: error instanceof Error ? error.message : String(error) };
  }

  const username = parsed.positionals[0];
  if (!username) {
    return {
      kind: "error",
      message: "analyze requires a GitHub username, e.g. `openready analyze octocat`.",
    };
  }
  if (parsed.positionals.length > 1) {
    return {
      kind: "error",
      message: `Unexpected extra arguments: ${parsed.positionals.slice(1).join(" ")}`,
    };
  }

  const format = (parsed.values.format as string | undefined) ?? "table";
  if (!VALID_FORMATS.includes(format as OutputFormat)) {
    return {
      kind: "error",
      message: `Unknown --format value: ${format}. Expected one of ${VALID_FORMATS.join(", ")}.`,
    };
  }

  const limitRaw = parsed.values.limit as string | undefined;
  let limit = 30;
  if (limitRaw !== undefined) {
    const parsedLimit = Number.parseInt(limitRaw, 10);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      return { kind: "error", message: `Invalid --limit value: ${limitRaw}` };
    }
    limit = parsedLimit;
  }

  return {
    kind: "analyze",
    username,
    format: format as OutputFormat,
    limit,
    repo: (parsed.values.repo as string | undefined) ?? null,
    out: (parsed.values.out as string | undefined) ?? null,
    token: (parsed.values.token as string | undefined) ?? null,
    fetchReadme: !(parsed.values["no-readme"] as boolean | undefined),
    fetchTree: !(parsed.values["no-tree"] as boolean | undefined),
  };
}
