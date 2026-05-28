import { beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import {
  GitHubClientError,
  fetchRepositoryReadme,
  fetchRepositoryTree,
  fetchUserRepositories,
} from "@/modules/github-client";
import { README_FETCH_LIMIT, TREE_FETCH_LIMIT, useRepositoryStore } from "./repositoryStore";
import type { Repository } from "@/types";

vi.mock("@/modules/github-client", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    fetchRepositoryReadme: vi.fn(),
    fetchRepositoryTree: vi.fn(),
    fetchUserRepositories: vi.fn(),
  };
});

const fetchUserRepositoriesMock = vi.mocked(fetchUserRepositories);
const fetchRepositoryReadmeMock = vi.mocked(fetchRepositoryReadme);
const fetchRepositoryTreeMock = vi.mocked(fetchRepositoryTree);

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

beforeEach(() => {
  useRepositoryStore.getState().reset();
  fetchUserRepositoriesMock.mockReset();
  fetchRepositoryReadmeMock.mockReset();
  fetchRepositoryReadmeMock.mockResolvedValue(null);
  fetchRepositoryTreeMock.mockReset();
  fetchRepositoryTreeMock.mockResolvedValue(null);
});

describe("repositoryStore", () => {
  it("stores fetched repositories in memory", async () => {
    fetchUserRepositoriesMock.mockResolvedValueOnce([repository]);

    await useRepositoryStore.getState().fetchRepositories(" octocat ");

    expect(fetchUserRepositoriesMock).toHaveBeenCalledWith("octocat");
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
    fetchUserRepositoriesMock.mockResolvedValueOnce(repositories);
    fetchRepositoryReadmeMock.mockResolvedValue(null);

    await useRepositoryStore.getState().fetchRepositories("octocat");

    await waitFor(() => {
      expect(useRepositoryStore.getState().readmeStatus).toBe("complete");
    });
    expect(fetchRepositoryReadmeMock).toHaveBeenCalledTimes(README_FETCH_LIMIT);
    expect(fetchRepositoryReadmeMock).toHaveBeenCalledWith("octocat", "repo-1");
    expect(fetchRepositoryReadmeMock).not.toHaveBeenCalledWith("octocat", "repo-31");
  });

  it("marks README failures unknown without failing repository fetch", async () => {
    fetchUserRepositoriesMock.mockResolvedValueOnce([repository]);
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
    fetchUserRepositoriesMock.mockResolvedValueOnce(repositories);
    fetchRepositoryTreeMock.mockResolvedValue({
      repositoryFullName: "octocat/repo-1",
      truncated: false,
      entries: [
        { path: "package.json", type: "blob" },
        { path: "pnpm-lock.yaml", type: "blob" },
        { path: "Dockerfile", type: "blob" },
        { path: ".github/workflows/ci.yml", type: "blob" },
      ],
    });

    await useRepositoryStore.getState().fetchRepositories("octocat");

    await waitFor(() => {
      expect(useRepositoryStore.getState().treeStatus).toBe("complete");
    });
    expect(fetchRepositoryTreeMock).toHaveBeenCalledTimes(TREE_FETCH_LIMIT);
    expect(fetchRepositoryTreeMock).toHaveBeenCalledWith("octocat", "repo-1", "main");

    const analysis = useRepositoryStore.getState().analyses[0];
    expect(analysis.checks.find((check) => check.id === "dockerfile")?.status).toBe("passed");
    expect(analysis.checks.find((check) => check.id === "github-actions")?.status).toBe("passed");
  });

  it("marks tree failures unknown without failing repository fetch", async () => {
    fetchUserRepositoriesMock.mockResolvedValueOnce([repository]);
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

  it("resets repository state", async () => {
    fetchUserRepositoriesMock.mockResolvedValueOnce([repository]);
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
