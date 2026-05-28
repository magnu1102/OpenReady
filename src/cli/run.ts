import { writeFile } from "node:fs/promises";
import {
  fetchUserRepositories,
  fetchRepositoryReadme,
  fetchRepositoryTree,
  GitHubClientError,
} from "@/modules/github-client";
import { analyzeRepositories } from "@/modules/analyzer-core";
import { exportJsonSummary, exportMarkdownReport } from "@/modules/export-engine";
import type {
  AnalysisResult,
  Repository,
  RepositoryReadmeState,
  RepositoryTreeState,
} from "@/types";
import type { AnalyzeArgs, OutputFormat } from "./args";
import { applyGitHubAuth } from "./auth";
import { renderTable } from "./renderers/table";

export interface RunResult {
  exitCode: number;
}

export async function runAnalyze(args: AnalyzeArgs): Promise<RunResult> {
  const token = applyGitHubAuth(args.token, process.env);

  let repositories: Repository[];
  try {
    repositories = await fetchUserRepositories(args.username);
  } catch (error) {
    return fail(error);
  }

  const limited = repositories.slice(0, args.limit);

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

  const analyses = analyzeRepositories(limited, readmes, trees);
  const rendered = render(args.format, analyses, {
    username: args.username,
    tokenInUse: Boolean(token),
    totalFetched: repositories.length,
    analyzedCount: analyses.length,
  });

  await emit(rendered, args.out);
  return { exitCode: 0 };
}

interface RenderOptions {
  username: string;
  tokenInUse: boolean;
  totalFetched: number;
  analyzedCount: number;
}

function render(format: OutputFormat, analyses: AnalysisResult[], options: RenderOptions): string {
  if (format === "json") {
    return exportJsonSummary({
      username: options.username,
      analyses,
      generatedAt: new Date().toISOString(),
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
