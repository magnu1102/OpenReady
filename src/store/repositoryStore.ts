import { create } from "zustand";
import {
  clearAnalysisCache,
  createAnalysisCacheSnapshot,
  getCachedAnalysis,
  listCachedAnalyses,
  saveAnalysisSnapshot,
  snapshotToMetadata,
  type AnalysisCacheMetadata,
} from "@/lib/analysisCache";
import { analyzeRepositories, analyzeRepository } from "@/modules/analyzer-core";
import {
  fetchRepositoryReadme,
  fetchRepositoryTree,
  fetchUserRepositories,
  GitHubClientError,
} from "@/modules/github-client";
import type { GitHubClientErrorCode } from "@/modules/github-client";
import type {
  AnalysisResult,
  ProjectType,
  Repository,
  RepositoryReadmeState,
  RepositoryTreeState,
} from "@/types";

export type RepositoryFetchStatus = "idle" | "loading" | "success" | "error";
export type ReadmeFetchStatus = "idle" | "loading" | "complete";
export type TreeFetchStatus = "idle" | "loading" | "complete";
export type CacheStatus = "idle" | "loading" | "ready" | "error";
export const README_FETCH_LIMIT = 30;
export const TREE_FETCH_LIMIT = 30;

export interface RepositoryFetchError {
  code: GitHubClientErrorCode;
  message: string;
}

interface RepositoryState {
  username: string;
  repositories: Repository[];
  readmes: Record<string, RepositoryReadmeState>;
  trees: Record<string, RepositoryTreeState>;
  analyses: AnalysisResult[];
  status: RepositoryFetchStatus;
  readmeStatus: ReadmeFetchStatus;
  treeStatus: TreeFetchStatus;
  cacheStatus: CacheStatus;
  cachedAnalyses: AnalysisCacheMetadata[];
  activeCache: AnalysisCacheMetadata | null;
  error: RepositoryFetchError | null;
  fetchRepositories: (username: string, options?: { forceRefresh?: boolean }) => Promise<void>;
  loadCachedAnalyses: () => Promise<void>;
  restoreCachedAnalysis: (username: string) => Promise<boolean>;
  clearRepositoryCache: () => Promise<void>;
  overrideClassification: (repositoryId: string, type: ProjectType | null) => Promise<void>;
  reset: () => void;
}

const initialState = {
  username: "",
  repositories: [],
  readmes: {},
  trees: {},
  analyses: [],
  status: "idle" as const,
  readmeStatus: "idle" as const,
  treeStatus: "idle" as const,
  cacheStatus: "idle" as const,
  cachedAnalyses: [],
  activeCache: null,
  error: null,
};

export const useRepositoryStore = create<RepositoryState>((set, get) => ({
  ...initialState,
  fetchRepositories: async (username, _options) => {
    const normalized = username.trim();
    set({
      username: normalized,
      repositories: [],
      readmes: {},
      trees: {},
      analyses: [],
      status: "loading",
      readmeStatus: "idle",
      treeStatus: "idle",
      activeCache: null,
      error: null,
    });

    try {
      const repositories = await fetchUserRepositories(normalized);
      const fetchedAt = new Date().toISOString();
      set({
        repositories,
        analyses: analyzeRepositories(repositories),
        status: "success",
        readmeStatus: repositories.length > 0 ? "loading" : "complete",
        treeStatus: repositories.length > 0 ? "loading" : "complete",
        error: null,
      });

      void fetchRepositoryDetailsAndCache(repositories, normalized, fetchedAt, set, get);
    } catch (error) {
      const repositoryError = toRepositoryFetchError(error);
      set({
        repositories: [],
        readmes: {},
        trees: {},
        analyses: [],
        status: "error",
        readmeStatus: "idle",
        treeStatus: "idle",
        activeCache: null,
        error: repositoryError,
      });
      throw error;
    }
  },
  loadCachedAnalyses: async () => {
    set({ cacheStatus: "loading" });
    try {
      const cachedAnalyses = await listCachedAnalyses();
      set({ cachedAnalyses, cacheStatus: "ready" });
    } catch {
      set({ cachedAnalyses: [], cacheStatus: "error" });
    }
  },
  restoreCachedAnalysis: async (username) => {
    const snapshot = await getCachedAnalysis(username);
    if (!snapshot) return false;

    set({
      username: snapshot.username,
      repositories: snapshot.repositories,
      readmes: snapshot.readmes,
      trees: snapshot.trees,
      analyses: snapshot.analyses,
      status: "success",
      readmeStatus: "complete",
      treeStatus: "complete",
      activeCache: snapshotToMetadata(snapshot),
      error: null,
    });
    return true;
  },
  clearRepositoryCache: async () => {
    await clearAnalysisCache();
    set({ cachedAnalyses: [], activeCache: null, cacheStatus: "ready" });
  },
  overrideClassification: async (repositoryId, type) => {
    const state = get();
    const repository = state.repositories.find((candidate) => candidate.id === repositoryId);
    if (!repository) return;

    const updated = analyzeRepository(
      repository,
      state.readmes[repositoryId],
      state.trees[repositoryId],
      new Date(),
      type ?? undefined,
    );

    const analyses = state.analyses.map((analysis) =>
      analysis.repository.id === repositoryId ? updated : analysis,
    );
    set({ analyses });

    if (!state.username) return;
    const fetchedAt = state.activeCache?.fetchedAt ?? new Date().toISOString();
    const snapshot = createAnalysisCacheSnapshot({
      username: state.username,
      repositories: state.repositories,
      readmes: state.readmes,
      trees: state.trees,
      analyses,
      fetchedAt,
    });
    try {
      await saveAnalysisSnapshot(snapshot);
      set({ activeCache: snapshotToMetadata(snapshot) });
    } catch {
      // Cache write failure is non-fatal for the override flow.
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

async function fetchRepositoryDetailsAndCache(
  repositories: Repository[],
  username: string,
  fetchedAt: string,
  set: (
    partial: Partial<RepositoryState> | ((state: RepositoryState) => Partial<RepositoryState>),
  ) => void,
  get: () => RepositoryState,
): Promise<void> {
  await Promise.all([
    fetchReadmesForRepositories(repositories, username, set, get),
    fetchTreesForRepositories(repositories, username, set, get),
  ]);

  if (get().username !== username) return;
  await saveCurrentSnapshot(username, fetchedAt, set, get);
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
        // The 'satisfies' operator ensures the object matches the RepositoryReadmeState type without type casting.
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
      analyses: analyzeRepositories(state.repositories, readmes, state.trees),
      readmeStatus: "complete",
    };
  });
}

function toReadmeUnknownMessage(error: unknown): string {
  if (error instanceof GitHubClientError) return error.message;
  return "README could not be checked.";
}

async function fetchTreesForRepositories(
  repositories: Repository[],
  username: string,
  set: (
    partial: Partial<RepositoryState> | ((state: RepositoryState) => Partial<RepositoryState>),
  ) => void,
  get: () => RepositoryState,
): Promise<void> {
  const repositoriesToCheck = repositories.slice(0, TREE_FETCH_LIMIT);

  if (repositoriesToCheck.length === 0) {
    set({ treeStatus: "complete" });
    return;
  }

  const entries = await Promise.all(
    repositoriesToCheck.map(async (repository) => {
      const [owner, repo] = repository.fullName.split("/");
      try {
        const tree = await fetchRepositoryTree(owner, repo, repository.defaultBranch);
        if (!tree) {
          return [repository.id, { status: "empty" } satisfies RepositoryTreeState] as const;
        }
        const state: RepositoryTreeState = tree.truncated
          ? { status: "truncated", tree }
          : { status: "found", tree };
        return [repository.id, state] as const;
      } catch (error) {
        return [
          repository.id,
          {
            status: "unknown",
            message: toTreeUnknownMessage(error),
          } satisfies RepositoryTreeState,
        ] as const;
      }
    }),
  );

  if (get().username !== username) return;

  set((state) => {
    const trees = {
      ...state.trees,
      ...Object.fromEntries(entries),
    };
    return {
      trees,
      analyses: analyzeRepositories(state.repositories, state.readmes, trees),
      treeStatus: "complete",
    };
  });
}

function toTreeUnknownMessage(error: unknown): string {
  if (error instanceof GitHubClientError) return error.message;
  return "Repository file tree could not be checked.";
}

async function saveCurrentSnapshot(
  username: string,
  fetchedAt: string,
  set: (
    partial: Partial<RepositoryState> | ((state: RepositoryState) => Partial<RepositoryState>),
  ) => void,
  get: () => RepositoryState,
): Promise<void> {
  const state = get();
  const savedAt = new Date().toISOString();
  const snapshot = createAnalysisCacheSnapshot({
    username,
    repositories: state.repositories,
    readmes: state.readmes,
    trees: state.trees,
    analyses: state.analyses,
    fetchedAt,
    savedAt,
  });

  try {
    await saveAnalysisSnapshot(snapshot);
    const cachedAnalyses = await listCachedAnalyses();
    set({
      cachedAnalyses,
      cacheStatus: "ready",
      activeCache: snapshotToMetadata(snapshot),
    });
  } catch {
    set({ cacheStatus: "error" });
  }
}
