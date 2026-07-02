import { readFile, writeFile } from "node:fs/promises";
import {
  fetchUserRepositories,
  fetchRepositoryReadme,
  fetchRepositoryTree,
  GitHubClientError,
} from "@/modules/github-client";
import { analyzeRepositories, collectTechSignals } from "@/modules/analyzer-core";
import { exportJsonSummary, exportMarkdownReport } from "@/modules/export-engine";
import { buildCheckSnapshot, runCheckPlugins } from "@/modules/check-plugins";
import type { CheckPack, CheckPlugin, CustomCheckResult } from "@/modules/check-plugins";
import { loadPacks } from "@/modules/check-plugins/loadNode";
import { parseProfile } from "@/modules/profiles";
import type { TeamProfile } from "@/modules/profiles";
import type {
  AnalysisResult,
  Repository,
  RepositoryReadmeState,
  RepositoryTreeState,
} from "@/types";
import type { AnalyzeArgs, OutputFormat } from "./args";
import { applyGitHubAuth } from "./auth";
import { evaluateGating } from "./gating";
import { renderTable } from "./renderers/table";

export interface RunResult {
  exitCode: number;
}

export async function runAnalyze(args: AnalyzeArgs): Promise<RunResult> {
  const token = applyGitHubAuth(args.token, process.env);

  // Resolve the profile and check packs before touching the GitHub API, so an
  // invalid --profile or --plugins input fails fast without burning rate limit.
  let profile: TeamProfile | null = null;
  if (args.profile) {
    try {
      profile = await loadProfileFile(args.profile);
    } catch (error) {
      return usageFail(error);
    }
  }

  let packs: CheckPack[] = [];
  if (args.plugins.length > 0 && args.allowPlugins) {
    try {
      packs = await loadPacks(args.plugins);
    } catch (error) {
      return usageFail(error);
    }
  }
  const plugins: CheckPlugin[] = packs.flatMap((pack) => pack.checks);

  let repositories: Repository[];
  try {
    repositories = await fetchUserRepositories(args.username);
  } catch (error) {
    return fail(error);
  }

  let selected = repositories;
  if (args.repo) {
    const needle = args.repo.toLowerCase();
    selected = repositories.filter(
      (repository) =>
        repository.name.toLowerCase() === needle || repository.fullName.toLowerCase() === needle,
    );
    if (selected.length === 0) {
      process.stderr.write(
        `openready: no repository matched --repo ${args.repo} for user ${args.username}.\n`,
      );
      return { exitCode: 3 };
    }
  }
  const limited = selected.slice(0, args.limit);

  if (limited.length === 0) {
    process.stderr.write(`openready: ${args.username} has no public repositories to analyze.\n`);
    return { exitCode: 0 };
  }

  const readmes: Record<string, RepositoryReadmeState> = {};
  if (args.fetchReadme) {
    await Promise.all(
      limited.map(async (repository) => {
        const [owner, repo] = repository.fullName.split("/");
        try {
          const readme = await fetchRepositoryReadme(owner, repo);
          readmes[repository.id] = readme ? { status: "found", readme } : { status: "missing" };
        } catch (error) {
          readmes[repository.id] = {
            status: "unknown",
            message: error instanceof Error ? error.message : "README could not be fetched.",
          };
        }
      }),
    );
  }

  const trees: Record<string, RepositoryTreeState> = {};
  if (args.fetchTree) {
    await Promise.all(
      limited.map(async (repository) => {
        const [owner, repo] = repository.fullName.split("/");
        try {
          const tree = await fetchRepositoryTree(owner, repo, repository.defaultBranch);
          if (!tree) {
            trees[repository.id] = { status: "empty" };
            return;
          }
          trees[repository.id] = tree.truncated
            ? { status: "truncated", tree }
            : { status: "found", tree };
        } catch (error) {
          trees[repository.id] = {
            status: "unknown",
            message: error instanceof Error ? error.message : "Tree could not be fetched.",
          };
        }
      }),
    );
  }

  // Profile category weights are user multipliers on top of the project-type
  // profile weights — the same mechanism the desktop Settings weights use.
  const analyses = analyzeRepositories(
    limited,
    readmes,
    trees,
    new Date(),
    {},
    profile?.categoryWeights ?? {},
  );

  const customChecksByRepo: Record<string, CustomCheckResult[]> = {};
  if (plugins.length > 0) {
    for (const repository of limited) {
      const snapshot = buildCheckSnapshot(
        repository,
        readmes[repository.id],
        trees[repository.id],
        collectTechSignals(trees[repository.id]),
      );
      customChecksByRepo[repository.id] = runCheckPlugins(plugins, snapshot);
    }
  }

  const rendered = render(args.format, analyses, {
    username: args.username,
    tokenInUse: Boolean(token),
    totalFetched: repositories.length,
    analyzedCount: analyses.length,
    customChecksByRepo: plugins.length > 0 ? customChecksByRepo : undefined,
  });

  await emit(rendered, args.out);

  // The explicit flag wins over the profile threshold.
  const failUnder = args.failUnder ?? profile?.thresholds?.failUnder ?? null;
  const gate = evaluateGating(analyses, customChecksByRepo, {
    failUnder,
    requireChecks: args.requireChecks,
  });
  if (!gate.passed) {
    for (const reason of gate.reasons) {
      process.stderr.write(`openready: gate: ${reason}\n`);
    }
    const noun = gate.reasons.length === 1 ? "violation" : "violations";
    process.stderr.write(`openready: gate failed with ${gate.reasons.length} ${noun}.\n`);
    return { exitCode: 4 };
  }
  return { exitCode: 0 };
}

async function loadProfileFile(path: string): Promise<TeamProfile> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    throw new Error(`Profile file not found or unreadable: ${path}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`Profile file is not valid JSON: ${path}`);
  }
  const parsed = parseProfile(json);
  if (!parsed.ok) throw new Error(`Invalid profile ${path}: ${parsed.error}`);
  return parsed.profile;
}

interface RenderOptions {
  username: string;
  tokenInUse: boolean;
  totalFetched: number;
  analyzedCount: number;
  /** Set only when plugins ran; adds `customChecks` arrays to the JSON export. */
  customChecksByRepo?: Record<string, CustomCheckResult[]>;
}

function render(format: OutputFormat, analyses: AnalysisResult[], options: RenderOptions): string {
  if (format === "json") {
    return exportJsonSummary({
      username: options.username,
      analyses,
      generatedAt: new Date().toISOString(),
      customChecksByRepo: options.customChecksByRepo,
    });
  }
  if (format === "markdown") {
    return exportMarkdownReport({
      username: options.username,
      analyses,
      generatedAt: new Date().toISOString(),
    });
  }
  return renderTable(analyses, options);
}

async function emit(content: string, out: string | null): Promise<void> {
  if (out) {
    await writeFile(out, content.endsWith("\n") ? content : content + "\n");
    process.stderr.write(`Wrote analysis to ${out}\n`);
    return;
  }
  process.stdout.write(content.endsWith("\n") ? content : content + "\n");
}

/** Invalid --profile / --plugins inputs are usage errors, matching parse failures. */
function usageFail(error: unknown): RunResult {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`openready: ${message}\n`);
  return { exitCode: 2 };
}

function fail(error: unknown): RunResult {
  if (error instanceof GitHubClientError) {
    process.stderr.write(`openready: ${error.message}\n`);
    return { exitCode: 1 };
  }
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`openready: ${message}\n`);
  return { exitCode: 1 };
}

// Re-exported for tests that want to swap in fixtures.
export type { AnalysisResult };
