import { create } from "zustand";
import { analyzeRepositories } from "@/modules/analyzer-core";
import {
  fetchRepositoryReadme,
  fetchUserRepositories,
  GitHubClientError,
} from "@/modules/github-client";
import type { GitHubClientErrorCode } from "@/modules/github-client";
import type { AnalysisResult, Repository, RepositoryReadmeState } from "@/types";

export type RepositoryFetchStatus = "idle" | "loading" | "success" | "error";
export type ReadmeFetchStatus = "idle" | "loading" | "complete";
export const README_FETCH_LIMIT = 30;

export interface RepositoryFetchError {
  code: GitHubClientErrorCode;
  message: string;
}

interface RepositoryState {
  username: string;
  repositories: Repository[];
  readmes: Record<string, RepositoryReadmeState>;
  analyses: AnalysisResult[];
  status: RepositoryFetchStatus;
  readmeStatus: ReadmeFetchStatus;
  error: RepositoryFetchError | null;
  fetchRepositories: (username: string) => Promise<void>;
  reset: () => void;
}

const initialState = {
  username: "",
  repositories: [],
  readmes: {},
  analyses: [],
  status: "idle" as const,
  readmeStatus: "idle" as const,
  error: null,
};

export const useRepositoryStore = create<RepositoryState>((set, get) => ({
  ...initialState,
  fetchRepositories: async (username) => {
    const normalized = username.trim();
    set({
      username: normalized,
      repositories: [],
      readmes: {},
      analyses: [],
      status: "loading",
      readmeStatus: "idle",
      error: null,
    });

    try {
      const repositories = await fetchUserRepositories(normalized);
      set({
        repositories,
        analyses: analyzeRepositories(repositories),
        status: "success",
        readmeStatus: repositories.length > 0 ? "loading" : "complete",
        error: null,
      });

      void fetchReadmesForRepositories(repositories, normalized, set, get);
    } catch (error) {
      const repositoryError = toRepositoryFetchError(error);
      set({
        repositories: [],
        readmes: {},
        analyses: [],
        status: "error",
        readmeStatus: "idle",
        error: repositoryError,
      });
      throw error;
    }
  },
  reset: () => set(initialState),
}));

function toRepositoryFetchError(error: unknown): RepositoryFetchError {
  if (error instanceof GitHubClientError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  return {
    code: "api-error",
    message: "OpenReady could not fetch repositories. Try again later.",
  };
}

async function fetchReadmesForRepositories(
  repositories: Repository[],
  username: string,
  set: (
    partial: Partial<RepositoryState> | ((state: RepositoryState) => Partial<RepositoryState>),
  ) => void,
  get: () => RepositoryState,
): Promise<void> {
  const repositoriesToCheck = repositories.slice(0, README_FETCH_LIMIT);

  if (repositoriesToCheck.length === 0) {
    set({ readmeStatus: "complete" });
    return;
  }

  const entries = await Promise.all(
    repositoriesToCheck.map(async (repository) => {
      const [owner, repo] = repository.fullName.split("/");
      try {
        const readme = await fetchRepositoryReadme(owner, repo);
        return [
          repository.id,
          readme
            ? ({ status: "found", readme } satisfies RepositoryReadmeState)
            : { status: "missing" },
        ] as const;
      } catch (error) {
        return [
          repository.id,
          {
            status: "unknown",
            message: toReadmeUnknownMessage(error),
          } satisfies RepositoryReadmeState,
        ] as const;
      }
    }),
  );

  if (get().username !== username) return;

  set((state) => {
    const readmes = {
      ...state.readmes,
      ...Object.fromEntries(entries),
    };
    return {
      readmes,
      analyses: analyzeRepositories(state.repositories, readmes),
      readmeStatus: "complete",
    };
  });
}

function toReadmeUnknownMessage(error: unknown): string {
  if (error instanceof GitHubClientError) return error.message;
  return "README could not be checked.";
}
