import { beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { clearAnalysisCache, getCachedAnalysis } from "@/lib/analysisCache";
import {
  GitHubClientError,
  fetchRepositoryReadmeWithMetadata,
  fetchRepositoryTreeWithMetadata,
  fetchUserRepositoriesWithMetadata,
} from "@/modules/github-client";
import type { GitHubRequestMetadata } from "@/modules/github-client";
import { README_FETCH_LIMIT, TREE_FETCH_LIMIT, useRepositoryStore } from "./repositoryStore";
import { usePreferencesStore } from "./preferencesStore";
import type { Repository } from "@/types";

vi.mock("@/modules/github-client", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    fetchRepositoryReadmeWithMetadata: vi.fn(),
    fetchRepositoryTreeWithMetadata: vi.fn(),
    fetchUserRepositoriesWithMetadata: vi.fn(),
  };
});

const fetchUserRepositoriesMock = vi.mocked(fetchUserRepositoriesWithMetadata);
const fetchRepositoryReadmeMock = vi.mocked(fetchRepositoryReadmeWithMetadata);
const fetchRepositoryTreeMock = vi.mocked(fetchRepositoryTreeWithMetadata);

const repository: Repository = {
  id: "1",
  name: "openready",
  fullName: "octocat/openready",
  description: "Repository health desktop app",
  url: "https://github.com/octocat/openready",
  homepageUrl: null,
  language: "TypeScript",
  topics: ["desktop", "github"],
  license: {
    key: "mit",
    name: "MIT License",
    spdxId: "MIT",
    url: "https://api.github.com/licenses/mit",
  },
  defaultBranch: "main",
  stars: 4,
  forks: 1,
  archived: false,
  fork: false,
  createdAt: "2025-05-28T10:00:00Z",
  updatedAt: "2026-05-28T10:00:00Z",
  pushedAt: "2026-05-28T09:00:00Z",
};

const OCTOCAT_REPOSITORY_LIST_KEY = "/users/octocat/repos?direction=desc&per_page=100&sort=pushed";

function metadata(requestKey = "test", etag: string | null = null): GitHubRequestMetadata {
  return {
    status: 200,
    etag,
    requestKey,
    rateLimit: {
      limit: null,
      remaining: null,
      used: null,
      reset: null,
    },
  };
}

function repositoryResult(
  repositories: Repository[],
  etag: string | null = null,
  requestKey = "repository-list",
) {
  return {
    data: repositories,
    notModified: false,
    metadata: metadata(requestKey, etag),
  };
}

function readmeResult(
  readme: Awaited<ReturnType<typeof fetchRepositoryReadmeWithMetadata>>["data"],
) {
  return {
    data: readme,
    notModified: false,
    metadata: metadata("readme"),
  };
}

function treeResult(tree: Awaited<ReturnType<typeof fetchRepositoryTreeWithMetadata>>["data"]) {
  return {
    data: tree,
    notModified: false,
    metadata: metadata("tree"),
  };
}

beforeEach(async () => {
  await clearAnalysisCache();
  useRepositoryStore.getState().reset();
  usePreferencesStore.getState().resetWeights();
  fetchUserRepositoriesMock.mockReset();
  fetchUserRepositoriesMock.mockResolvedValue(repositoryResult([repository]));
  fetchRepositoryReadmeMock.mockReset();
  fetchRepositoryReadmeMock.mockResolvedValue(readmeResult(null));
  fetchRepositoryTreeMock.mockReset();
  fetchRepositoryTreeMock.mockResolvedValue(treeResult(null));
});

describe("repositoryStore", () => {
  it("stores fetched repositories in memory", async () => {
    fetchUserRepositoriesMock.mockResolvedValueOnce(repositoryResult([repository]));

    await useRepositoryStore.getState().fetchRepositories(" octocat ");

    expect(fetchUserRepositoriesMock).toHaveBeenCalledWith("octocat", { etag: null });
    expect(useRepositoryStore.getState()).toMatchObject({
      username: "octocat",
      repositories: [repository],
      analyses: [
        expect.objectContaining({
          repository,
          healthLabel: expect.any(String),
        }),
      ],
      status: "success",
      error: null,
    });
  });

  it("fetches README data for the first 30 repositories", async () => {
    const repositories = Array.from({ length: README_FETCH_LIMIT + 2 }, (_, index) => ({
      ...repository,
      id: String(index + 1),
      name: `repo-${index + 1}`,
      fullName: `octocat/repo-${index + 1}`,
    }));
    fetchUserRepositoriesMock.mockResolvedValueOnce(repositoryResult(repositories));
    fetchRepositoryReadmeMock.mockResolvedValue(readmeResult(null));

    await useRepositoryStore.getState().fetchRepositories("octocat");

    await waitFor(() => {
      expect(useRepositoryStore.getState().readmeStatus).toBe("complete");
    });
    expect(fetchRepositoryReadmeMock).toHaveBeenCalledTimes(README_FETCH_LIMIT);
    expect(fetchRepositoryReadmeMock).toHaveBeenCalledWith("octocat", "repo-1", { etag: null });
    expect(fetchRepositoryReadmeMock).not.toHaveBeenCalledWith("octocat", "repo-31", {
      etag: null,
    });
  });

  it("marks README failures unknown without failing repository fetch", async () => {
    fetchUserRepositoriesMock.mockResolvedValueOnce(repositoryResult([repository]));
    fetchRepositoryReadmeMock.mockRejectedValueOnce(
      new GitHubClientError("rate-limit", "GitHub rate limit reached.", 403),
    );

    await useRepositoryStore.getState().fetchRepositories("octocat");

    await waitFor(() => {
      expect(useRepositoryStore.getState().readmeStatus).toBe("complete");
    });
    expect(useRepositoryStore.getState().readmes[repository.id]).toEqual({
      status: "unknown",
      message: "GitHub rate limit reached.",
    });
    expect(useRepositoryStore.getState().analyses[0].unknownCount).toBeGreaterThan(0);
  });

  it("stores structured errors and rethrows the original failure", async () => {
    const error = new GitHubClientError(
      "rate-limit",
      "GitHub rate limit reached. Wait a while and try again.",
      403,
    );
    fetchUserRepositoriesMock.mockRejectedValueOnce(error);

    await expect(useRepositoryStore.getState().fetchRepositories("octocat")).rejects.toBe(error);

    expect(useRepositoryStore.getState()).toMatchObject({
      username: "octocat",
      repositories: [],
      status: "error",
      error: {
        code: "rate-limit",
        message: "GitHub rate limit reached. Wait a while and try again.",
      },
    });
  });

  it("fetches file trees for the first 30 repositories and feeds them into analyses", async () => {
    const repositories = Array.from({ length: TREE_FETCH_LIMIT + 2 }, (_, index) => ({
      ...repository,
      id: String(index + 1),
      name: `repo-${index + 1}`,
      fullName: `octocat/repo-${index + 1}`,
    }));
    fetchUserRepositoriesMock.mockResolvedValueOnce(repositoryResult(repositories));
    fetchRepositoryTreeMock.mockResolvedValue({
      data: {
        repositoryFullName: "octocat/repo-1",
        truncated: false,
        entries: [
          { path: "package.json", type: "blob" },
          { path: "pnpm-lock.yaml", type: "blob" },
          { path: "Dockerfile", type: "blob" },
          { path: ".github/workflows/ci.yml", type: "blob" },
        ],
      },
      notModified: false,
      metadata: metadata("tree"),
    });

    await useRepositoryStore.getState().fetchRepositories("octocat");

    await waitFor(() => {
      expect(useRepositoryStore.getState().treeStatus).toBe("complete");
    });
    expect(fetchRepositoryTreeMock).toHaveBeenCalledTimes(TREE_FETCH_LIMIT);
    expect(fetchRepositoryTreeMock).toHaveBeenCalledWith("octocat", "repo-1", "main", {
      etag: null,
    });

    const analysis = useRepositoryStore.getState().analyses[0];
    expect(analysis.checks.find((check) => check.id === "dockerfile")?.status).toBe("passed");
    expect(analysis.checks.find((check) => check.id === "github-actions")?.status).toBe("passed");
  });

  it("caches completed analysis snapshots after README and tree checks finish", async () => {
    fetchUserRepositoriesMock.mockResolvedValueOnce(repositoryResult([repository]));

    await useRepositoryStore.getState().fetchRepositories("octocat");

    await waitFor(() => {
      expect(useRepositoryStore.getState().activeCache).toMatchObject({
        username: "octocat",
        repositoryCount: 1,
      });
    });
    await expect(getCachedAnalysis("octocat")).resolves.toMatchObject({
      username: "octocat",
      repositories: [repository],
    });
  });

  it("stores GitHub request budget and ETags from repository fetches", async () => {
    fetchUserRepositoriesMock.mockResolvedValueOnce({
      data: [repository],
      notModified: false,
      metadata: {
        status: 200,
        etag: '"repo-list"',
        requestKey: OCTOCAT_REPOSITORY_LIST_KEY,
        rateLimit: {
          limit: 60,
          remaining: 59,
          used: 1,
          reset: 1_800_000_000,
        },
      },
    });

    await useRepositoryStore.getState().fetchRepositories("octocat");

    expect(useRepositoryStore.getState().githubBudget).toEqual({
      limit: 60,
      remaining: 59,
      used: 1,
      reset: 1_800_000_000,
    });
    expect(useRepositoryStore.getState().githubEtags[OCTOCAT_REPOSITORY_LIST_KEY]).toBe(
      '"repo-list"',
    );
  });

  it("reuses the cached snapshot when the repository list is not modified", async () => {
    fetchUserRepositoriesMock.mockResolvedValueOnce(
      repositoryResult([repository], '"repo-list"', OCTOCAT_REPOSITORY_LIST_KEY),
    );

    await useRepositoryStore.getState().fetchRepositories("octocat");
    await waitFor(() => {
      expect(useRepositoryStore.getState().activeCache).not.toBeNull();
    });

    fetchRepositoryReadmeMock.mockClear();
    fetchRepositoryTreeMock.mockClear();
    fetchUserRepositoriesMock.mockResolvedValueOnce({
      data: null,
      notModified: true,
      metadata: metadata(OCTOCAT_REPOSITORY_LIST_KEY, '"repo-list"'),
    });

    await useRepositoryStore.getState().fetchRepositories("octocat", { forceRefresh: true });

    expect(fetchUserRepositoriesMock).toHaveBeenLastCalledWith("octocat", {
      etag: '"repo-list"',
    });
    expect(fetchRepositoryReadmeMock).not.toHaveBeenCalled();
    expect(fetchRepositoryTreeMock).not.toHaveBeenCalled();
    expect(useRepositoryStore.getState().refreshSummary).toEqual({ reused: 1, refreshed: 0 });
  });

  it("reuses cached details for unchanged repositories during refresh", async () => {
    fetchUserRepositoriesMock.mockResolvedValueOnce(repositoryResult([repository]));

    await useRepositoryStore.getState().fetchRepositories("octocat");
    await waitFor(() => {
      expect(useRepositoryStore.getState().activeCache).not.toBeNull();
    });

    fetchRepositoryReadmeMock.mockClear();
    fetchRepositoryTreeMock.mockClear();
    fetchUserRepositoriesMock.mockResolvedValueOnce(repositoryResult([repository]));

    await useRepositoryStore.getState().fetchRepositories("octocat", { forceRefresh: true });

    await waitFor(() => {
      expect(useRepositoryStore.getState().refreshSummary).toEqual({ reused: 1, refreshed: 0 });
    });
    expect(fetchRepositoryReadmeMock).not.toHaveBeenCalled();
    expect(fetchRepositoryTreeMock).not.toHaveBeenCalled();
  });

  it("refetches details when a repository changed since the cached snapshot", async () => {
    fetchUserRepositoriesMock.mockResolvedValueOnce(repositoryResult([repository]));

    await useRepositoryStore.getState().fetchRepositories("octocat");
    await waitFor(() => {
      expect(useRepositoryStore.getState().activeCache).not.toBeNull();
    });

    const changed = { ...repository, pushedAt: "2026-05-29T09:00:00Z" };
    fetchRepositoryReadmeMock.mockClear();
    fetchRepositoryTreeMock.mockClear();
    fetchUserRepositoriesMock.mockResolvedValueOnce(repositoryResult([changed]));

    await useRepositoryStore.getState().fetchRepositories("octocat", { forceRefresh: true });

    await waitFor(() => {
      expect(useRepositoryStore.getState().refreshSummary).toEqual({ reused: 0, refreshed: 1 });
    });
    expect(fetchRepositoryReadmeMock).toHaveBeenCalledWith("octocat", "openready", {
      etag: null,
    });
    expect(fetchRepositoryTreeMock).toHaveBeenCalledWith("octocat", "openready", "main", {
      etag: null,
    });
  });

  it("loads and restores cached analyses without calling GitHub", async () => {
    fetchUserRepositoriesMock.mockResolvedValueOnce(repositoryResult([repository]));
    await useRepositoryStore.getState().fetchRepositories("octocat");
    await waitFor(() => {
      expect(useRepositoryStore.getState().activeCache).not.toBeNull();
    });

    useRepositoryStore.getState().reset();
    fetchUserRepositoriesMock.mockClear();

    await useRepositoryStore.getState().loadCachedAnalyses();
    const restored = await useRepositoryStore.getState().restoreCachedAnalysis("octocat");

    expect(restored).toBe(true);
    expect(fetchUserRepositoriesMock).not.toHaveBeenCalled();
    expect(useRepositoryStore.getState()).toMatchObject({
      username: "octocat",
      repositories: [repository],
      status: "success",
      readmeStatus: "complete",
      treeStatus: "complete",
    });
  });

  it("clears local analysis cache", async () => {
    fetchUserRepositoriesMock.mockResolvedValueOnce(repositoryResult([repository]));
    await useRepositoryStore.getState().fetchRepositories("octocat");
    await waitFor(() => {
      expect(useRepositoryStore.getState().cachedAnalyses).toHaveLength(1);
    });

    await useRepositoryStore.getState().clearRepositoryCache();

    expect(useRepositoryStore.getState().cachedAnalyses).toEqual([]);
    await expect(getCachedAnalysis("octocat")).resolves.toBeNull();
  });

  it("marks tree failures unknown without failing repository fetch", async () => {
    fetchUserRepositoriesMock.mockResolvedValueOnce(repositoryResult([repository]));
    fetchRepositoryTreeMock.mockRejectedValueOnce(
      new GitHubClientError("rate-limit", "GitHub rate limit reached.", 403),
    );

    await useRepositoryStore.getState().fetchRepositories("octocat");

    await waitFor(() => {
      expect(useRepositoryStore.getState().treeStatus).toBe("complete");
    });
    expect(useRepositoryStore.getState().trees[repository.id]).toEqual({
      status: "unknown",
      message: "GitHub rate limit reached.",
    });
  });

  it("recomputeAnalyses applies custom weights and re-scores in place", async () => {
    fetchUserRepositoriesMock.mockResolvedValueOnce(repositoryResult([repository]));
    await useRepositoryStore.getState().fetchRepositories("octocat");
    await waitFor(() => {
      expect(useRepositoryStore.getState().treeStatus).toBe("complete");
    });
    const before = useRepositoryStore.getState().analyses[0].score.total;

    // Drop documentation to zero weight; the total must change.
    usePreferencesStore.getState().setCategoryWeight("documentation", 0);
    await useRepositoryStore.getState().recomputeAnalyses();

    const after = useRepositoryStore.getState().analyses[0];
    expect(after.score.categories.find((c) => c.category === "documentation")?.weight).toBe(0);
    expect(after.score.total).not.toBe(before);
  });

  it("recomputeAnalyses preserves per-repo classification overrides", async () => {
    fetchUserRepositoriesMock.mockResolvedValueOnce(repositoryResult([repository]));
    await useRepositoryStore.getState().fetchRepositories("octocat");
    await waitFor(() => {
      expect(useRepositoryStore.getState().treeStatus).toBe("complete");
    });

    await useRepositoryStore.getState().overrideClassification(repository.id, "library");
    expect(useRepositoryStore.getState().analyses[0].classification.type).toBe("library");

    usePreferencesStore.getState().setCategoryWeight("testing-ci", 2);
    await useRepositoryStore.getState().recomputeAnalyses();

    const after = useRepositoryStore.getState().analyses[0];
    expect(after.classificationOverride).toBe("library");
    expect(after.classification.type).toBe("library");
    expect(after.classification.overridden).toBe(true);
  });

  it("resets repository state", async () => {
    fetchUserRepositoriesMock.mockResolvedValueOnce(repositoryResult([repository]));
    await useRepositoryStore.getState().fetchRepositories("octocat");

    useRepositoryStore.getState().reset();

    expect(useRepositoryStore.getState()).toMatchObject({
      username: "",
      repositories: [],
      status: "idle",
      error: null,
    });
  });
});
