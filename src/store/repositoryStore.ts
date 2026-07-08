import { create } from "zustand";
import {
  clearAnalysisCache,
  createAnalysisCacheSnapshot,
  emptyGitHubMetadata,
  getCachedAnalysis,
  listCachedAnalyses,
  saveAnalysisSnapshot,
  snapshotToMetadata,
  type AnalysisCacheGitHubMetadata,
  type AnalysisCacheMetadata,
  type AnalysisCacheSnapshot,
  type AnalysisRefreshSummary,
} from "@/lib/analysisCache";
import { analyzeRepositories, analyzeRepository } from "@/modules/analyzer-core";
import { usePreferencesStore } from "@/store/preferencesStore";
import {
  fetchRepositoryReadmeWithMetadata,
  fetchRepositoryTreeWithMetadata,
  fetchUserRepositoriesWithMetadata,
  GitHubClientError,
  githubRequestKey,
} from "@/modules/github-client";
import type {
  GitHubClientErrorCode,
  GitHubRateLimitBudget,
  GitHubRequestMetadata,
} from "@/modules/github-client";
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
  githubBudget: GitHubRateLimitBudget | null;
  githubEtags: Record<string, string>;
  refreshSummary: AnalysisRefreshSummary | null;
  error: RepositoryFetchError | null;
  fetchRepositories: (username: string, options?: { forceRefresh?: boolean }) => Promise<void>;
  loadCachedAnalyses: () => Promise<void>;
  restoreCachedAnalysis: (username: string) => Promise<boolean>;
  clearRepositoryCache: () => Promise<void>;
  overrideClassification: (repositoryId: string, type: ProjectType | null) => Promise<void>;
  recomputeAnalyses: () => Promise<void>;
  reset: () => void;
}

/** Current user-configured category weights from the persisted preferences store. */
function currentWeights() {
  return usePreferencesStore.getState().categoryWeights;
}

/** Reconstruct the per-repo classification overrides baked into the analyses. */
function overridesFromAnalyses(analyses: AnalysisResult[]): Record<string, ProjectType> {
  const overrides: Record<string, ProjectType> = {};
  for (const analysis of analyses) {
    if (analysis.classificationOverride) {
      overrides[analysis.repository.id] = analysis.classificationOverride;
    }
  }
  return overrides;
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
  githubBudget: null,
  githubEtags: {},
  refreshSummary: null,
  error: null,
};

export const useRepositoryStore = create<RepositoryState>((set, get) => ({
  ...initialState,
  fetchRepositories: async (username, options) => {
    const normalized = username.trim();
    const previousSnapshot = options?.forceRefresh ? await getCachedAnalysis(normalized) : null;
    const startingGithub = previousSnapshot?.github ?? emptyGitHubMetadata();
    const repositoryListEtag =
      previousSnapshot && previousSnapshot.repositories.length > 0
        ? startingGithub.etags[repositoryListRequestKey(normalized)]
        : null;

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
      githubBudget: null,
      githubEtags: startingGithub.etags,
      refreshSummary: null,
      error: null,
    });

    try {
      const fetchedAt = new Date().toISOString();
      const repositoryResult = await fetchUserRepositoriesWithMetadata(normalized, {
        etag: repositoryListEtag,
      });
      let github = mergeGitHubMetadata(startingGithub, repositoryResult.metadata);

      if (repositoryResult.notModified) {
        if (!previousSnapshot) {
          throw new GitHubClientError(
            "invalid-response",
            "GitHub returned a not-modified response without cached repository data.",
          );
        }

        const repositories = previousSnapshot.repositories;
        const analyses = analyzeRepositories(
          repositories,
          previousSnapshot.readmes,
          previousSnapshot.trees,
          new Date(),
          overridesFromAnalyses(previousSnapshot.analyses),
          currentWeights(),
        );
        const refreshSummary = {
          reused: Math.min(repositories.length, Math.max(README_FETCH_LIMIT, TREE_FETCH_LIMIT)),
          refreshed: 0,
        };
        github = { ...github, refreshSummary };

        set({
          repositories,
          readmes: previousSnapshot.readmes,
          trees: previousSnapshot.trees,
          analyses,
          status: "success",
          readmeStatus: "complete",
          treeStatus: "complete",
          githubBudget: github.rateLimit,
          githubEtags: github.etags,
          refreshSummary,
          error: null,
        });
        await saveCurrentSnapshot(normalized, fetchedAt, github, set, get);
        return;
      }

      if (!repositoryResult.data) {
        throw new GitHubClientError(
          "invalid-response",
          "GitHub returned an unexpected repository response.",
        );
      }

      const repositories = repositoryResult.data;
      set({
        repositories,
        analyses: analyzeRepositories(repositories, {}, {}, new Date(), {}, currentWeights()),
        status: "success",
        readmeStatus: repositories.length > 0 ? "loading" : "complete",
        treeStatus: repositories.length > 0 ? "loading" : "complete",
        githubBudget: github.rateLimit,
        githubEtags: github.etags,
        refreshSummary: null,
        error: null,
      });

      void fetchRepositoryDetailsAndCache(
        repositories,
        normalized,
        fetchedAt,
        previousSnapshot,
        github,
        set,
        get,
      );
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
        githubBudget: null,
        refreshSummary: null,
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
      githubBudget: snapshot.github.rateLimit,
      githubEtags: snapshot.github.etags,
      refreshSummary: snapshot.github.refreshSummary,
      error: null,
    });
    return true;
  },
  clearRepositoryCache: async () => {
    await clearAnalysisCache();
    set({
      cachedAnalyses: [],
      activeCache: null,
      cacheStatus: "ready",
      githubBudget: null,
      githubEtags: {},
      refreshSummary: null,
    });
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
      currentWeights(),
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
      github: githubMetadataFromState(state),
      fetchedAt,
    });
    try {
      await saveAnalysisSnapshot(snapshot);
      set({ activeCache: snapshotToMetadata(snapshot) });
    } catch {
      // Cache write failure is non-fatal for the override flow.
    }
  },
  recomputeAnalyses: async () => {
    const state = get();
    if (state.repositories.length === 0) return;

    const analyses = analyzeRepositories(
      state.repositories,
      state.readmes,
      state.trees,
      new Date(),
      overridesFromAnalyses(state.analyses),
      currentWeights(),
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
      github: githubMetadataFromState(state),
      fetchedAt,
    });
    try {
      await saveAnalysisSnapshot(snapshot);
      set({ activeCache: snapshotToMetadata(snapshot) });
    } catch {
      // Cache write failure is non-fatal for the recompute flow.
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
  previousSnapshot: AnalysisCacheSnapshot | null,
  github: AnalysisCacheGitHubMetadata,
  set: (
    partial: Partial<RepositoryState> | ((state: RepositoryState) => Partial<RepositoryState>),
  ) => void,
  get: () => RepositoryState,
): Promise<void> {
  const tracker = createRefreshTracker(Boolean(previousSnapshot));
  const [readmeResult, treeResult] = await Promise.all([
    fetchReadmesForRepositories(repositories, previousSnapshot, github, tracker),
    fetchTreesForRepositories(repositories, previousSnapshot, github, tracker),
  ]);

  if (get().username !== username) return;

  const refreshSummary = tracker.enabled ? refreshSummaryFromTracker(tracker) : null;
  const nextGithub = {
    ...combineGitHubMetadata(github, readmeResult.github, treeResult.github),
    refreshSummary,
  };
  const analyses = analyzeRepositories(
    repositories,
    readmeResult.readmes,
    treeResult.trees,
    new Date(),
    overridesFromAnalyses(get().analyses),
    currentWeights(),
  );

  set({
    readmes: readmeResult.readmes,
    trees: treeResult.trees,
    analyses,
    readmeStatus: "complete",
    treeStatus: "complete",
    githubBudget: nextGithub.rateLimit,
    githubEtags: nextGithub.etags,
    refreshSummary,
  });

  await saveCurrentSnapshot(username, fetchedAt, nextGithub, set, get);
}

async function fetchReadmesForRepositories(
  repositories: Repository[],
  previousSnapshot: AnalysisCacheSnapshot | null,
  github: AnalysisCacheGitHubMetadata,
  tracker: RefreshTracker,
): Promise<{
  readmes: Record<string, RepositoryReadmeState>;
  github: AnalysisCacheGitHubMetadata;
}> {
  const repositoriesToCheck = repositories.slice(0, README_FETCH_LIMIT);

  if (repositoriesToCheck.length === 0) {
    return { readmes: {}, github };
  }

  const entries = await Promise.all(
    repositoriesToCheck.map(async (repository) => {
      const [owner, repo] = repository.fullName.split("/");
      const cached = reusableReadmeState(repository, previousSnapshot);
      if (cached) {
        markReused(tracker, repository.id);
        return {
          repositoryId: repository.id,
          state: cached,
          metadata: null,
        };
      }

      markRefreshed(tracker, repository.id);
      try {
        const requestKey = readmeRequestKey(owner, repo);
        const staleCached = cachedDetailState(previousSnapshot?.readmes[repository.id]);
        const readme = await fetchRepositoryReadmeWithMetadata(owner, repo, {
          etag: staleCached ? (github.etags[requestKey] ?? null) : null,
        });
        if (readme.notModified && staleCached) {
          return {
            repositoryId: repository.id,
            state: staleCached,
            metadata: readme.metadata,
          };
        }
        // The 'satisfies' operator ensures the object matches the RepositoryReadmeState type without type casting.
        return {
          repositoryId: repository.id,
          state: readme.data
            ? ({ status: "found", readme: readme.data } satisfies RepositoryReadmeState)
            : ({ status: "missing" } satisfies RepositoryReadmeState),
          metadata: readme.metadata,
        };
      } catch (error) {
        return {
          repositoryId: repository.id,
          state: {
            status: "unknown",
            message: toReadmeUnknownMessage(error),
          } satisfies RepositoryReadmeState,
          metadata: null,
        };
      }
    }),
  );

  return entries.reduce(
    (result, entry) => {
      result.readmes[entry.repositoryId] = entry.state;
      if (entry.metadata) {
        result.github = mergeGitHubMetadata(result.github, entry.metadata);
      }
      return result;
    },
    { readmes: {}, github } as {
      readmes: Record<string, RepositoryReadmeState>;
      github: AnalysisCacheGitHubMetadata;
    },
  );
}

function toReadmeUnknownMessage(error: unknown): string {
  if (error instanceof GitHubClientError) return error.message;
  return "README could not be checked.";
}

async function fetchTreesForRepositories(
  repositories: Repository[],
  previousSnapshot: AnalysisCacheSnapshot | null,
  github: AnalysisCacheGitHubMetadata,
  tracker: RefreshTracker,
): Promise<{
  trees: Record<string, RepositoryTreeState>;
  github: AnalysisCacheGitHubMetadata;
}> {
  const repositoriesToCheck = repositories.slice(0, TREE_FETCH_LIMIT);

  if (repositoriesToCheck.length === 0) {
    return { trees: {}, github };
  }

  const entries = await Promise.all(
    repositoriesToCheck.map(async (repository) => {
      const [owner, repo] = repository.fullName.split("/");
      const cached = reusableTreeState(repository, previousSnapshot);
      if (cached) {
        markReused(tracker, repository.id);
        return {
          repositoryId: repository.id,
          state: cached,
          metadata: null,
        };
      }

      markRefreshed(tracker, repository.id);
      try {
        const requestKey = treeRequestKey(owner, repo, repository.defaultBranch);
        const staleCached = cachedDetailState(previousSnapshot?.trees[repository.id]);
        const tree = await fetchRepositoryTreeWithMetadata(owner, repo, repository.defaultBranch, {
          etag: staleCached ? (github.etags[requestKey] ?? null) : null,
        });
        if (tree.notModified && staleCached) {
          return {
            repositoryId: repository.id,
            state: staleCached,
            metadata: tree.metadata,
          };
        }
        if (!tree.data) {
          return {
            repositoryId: repository.id,
            state: { status: "empty" } satisfies RepositoryTreeState,
            metadata: tree.metadata,
          };
        }
        const state: RepositoryTreeState = tree.data.truncated
          ? { status: "truncated", tree: tree.data }
          : { status: "found", tree: tree.data };
        return {
          repositoryId: repository.id,
          state,
          metadata: tree.metadata,
        };
      } catch (error) {
        return {
          repositoryId: repository.id,
          state: {
            status: "unknown",
            message: toTreeUnknownMessage(error),
          } satisfies RepositoryTreeState,
          metadata: null,
        };
      }
    }),
  );

  return entries.reduce(
    (result, entry) => {
      result.trees[entry.repositoryId] = entry.state;
      if (entry.metadata) {
        result.github = mergeGitHubMetadata(result.github, entry.metadata);
      }
      return result;
    },
    { trees: {}, github } as {
      trees: Record<string, RepositoryTreeState>;
      github: AnalysisCacheGitHubMetadata;
    },
  );
}

function toTreeUnknownMessage(error: unknown): string {
  if (error instanceof GitHubClientError) return error.message;
  return "Repository file tree could not be checked.";
}

interface RefreshTracker {
  enabled: boolean;
  reusedRepoIds: Set<string>;
  refreshedRepoIds: Set<string>;
}

function createRefreshTracker(enabled: boolean): RefreshTracker {
  return {
    enabled,
    reusedRepoIds: new Set(),
    refreshedRepoIds: new Set(),
  };
}

function markReused(tracker: RefreshTracker, repositoryId: string): void {
  if (tracker.enabled) tracker.reusedRepoIds.add(repositoryId);
}

function markRefreshed(tracker: RefreshTracker, repositoryId: string): void {
  if (tracker.enabled) tracker.refreshedRepoIds.add(repositoryId);
}

function refreshSummaryFromTracker(tracker: RefreshTracker): AnalysisRefreshSummary {
  let reused = 0;
  for (const repositoryId of tracker.reusedRepoIds) {
    if (!tracker.refreshedRepoIds.has(repositoryId)) reused += 1;
  }
  return {
    reused,
    refreshed: tracker.refreshedRepoIds.size,
  };
}

function reusableReadmeState(
  repository: Repository,
  previousSnapshot: AnalysisCacheSnapshot | null,
): RepositoryReadmeState | null {
  if (!previousSnapshot || !isUnchangedRepository(repository, previousSnapshot)) return null;
  return cachedDetailState(previousSnapshot.readmes[repository.id]);
}

function reusableTreeState(
  repository: Repository,
  previousSnapshot: AnalysisCacheSnapshot | null,
): RepositoryTreeState | null {
  if (!previousSnapshot || !isUnchangedRepository(repository, previousSnapshot)) return null;
  return cachedDetailState(previousSnapshot.trees[repository.id]);
}

function cachedDetailState<T extends { status: string }>(state: T | undefined): T | null {
  if (!state || state.status === "unknown") return null;
  return state;
}

function isUnchangedRepository(
  repository: Repository,
  previousSnapshot: AnalysisCacheSnapshot,
): boolean {
  const previous = previousSnapshot.repositories.find(
    (candidate) => candidate.id === repository.id,
  );
  return (
    previous?.fullName === repository.fullName &&
    previous.defaultBranch === repository.defaultBranch &&
    previous.pushedAt === repository.pushedAt
  );
}

function mergeGitHubMetadata(
  current: AnalysisCacheGitHubMetadata,
  metadata: GitHubRequestMetadata,
): AnalysisCacheGitHubMetadata {
  const etags = { ...current.etags };
  if (metadata.etag) {
    etags[metadata.requestKey] = metadata.etag;
  }
  return {
    ...current,
    etags,
    rateLimit: hasRateLimitValue(metadata.rateLimit) ? metadata.rateLimit : current.rateLimit,
  };
}

function combineGitHubMetadata(
  ...items: AnalysisCacheGitHubMetadata[]
): AnalysisCacheGitHubMetadata {
  return items.reduce(
    (combined, item) => ({
      etags: { ...combined.etags, ...item.etags },
      rateLimit: chooseLatestBudget(combined.rateLimit, item.rateLimit),
      refreshSummary: item.refreshSummary ?? combined.refreshSummary,
    }),
    emptyGitHubMetadata(),
  );
}

function chooseLatestBudget(
  current: GitHubRateLimitBudget | null,
  next: GitHubRateLimitBudget | null,
): GitHubRateLimitBudget | null {
  if (!next) return current;
  if (!current) return next;
  if (current.remaining === null) return next;
  if (next.remaining === null) return current;
  return next.remaining <= current.remaining ? next : current;
}

function hasRateLimitValue(rateLimit: GitHubRateLimitBudget): boolean {
  return (
    rateLimit.limit !== null ||
    rateLimit.remaining !== null ||
    rateLimit.used !== null ||
    rateLimit.reset !== null
  );
}

function githubMetadataFromState(state: RepositoryState): AnalysisCacheGitHubMetadata {
  return {
    etags: state.githubEtags,
    rateLimit: state.githubBudget,
    refreshSummary: state.refreshSummary,
  };
}

const USER_REPOSITORY_QUERY: Array<[string, string]> = [
  ["sort", "pushed"],
  ["direction", "desc"],
  ["per_page", "100"],
];

function repositoryListRequestKey(username: string): string {
  return githubRequestKey(`/users/${encodeURIComponent(username)}/repos`, USER_REPOSITORY_QUERY);
}

function readmeRequestKey(owner: string, repo: string): string {
  return githubRequestKey(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`);
}

function treeRequestKey(owner: string, repo: string, branch: string): string {
  return githubRequestKey(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(
      branch,
    )}`,
    [["recursive", "1"]],
  );
}

async function saveCurrentSnapshot(
  username: string,
  fetchedAt: string,
  github: AnalysisCacheGitHubMetadata,
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
    github,
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
