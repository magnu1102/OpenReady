import { beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubClientError, fetchUserRepositories } from "@/modules/github-client";
import { useRepositoryStore } from "./repositoryStore";
import type { Repository } from "@/types";

vi.mock("@/modules/github-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/github-client")>();
  return {
    ...actual,
    fetchUserRepositories: vi.fn(),
  };
});

const fetchUserRepositoriesMock = vi.mocked(fetchUserRepositories);

const repository: Repository = {
  id: "1",
  name: "repopulse",
  fullName: "octocat/repopulse",
  description: "Repository health desktop app",
  url: "https://github.com/octocat/repopulse",
  homepageUrl: null,
  language: "TypeScript",
  stars: 4,
  forks: 1,
  archived: false,
  fork: false,
  updatedAt: "2026-05-28T10:00:00Z",
  pushedAt: "2026-05-28T09:00:00Z",
};

beforeEach(() => {
  useRepositoryStore.getState().reset();
  fetchUserRepositoriesMock.mockReset();
});

describe("repositoryStore", () => {
  it("stores fetched repositories in memory", async () => {
    fetchUserRepositoriesMock.mockResolvedValueOnce([repository]);

    await useRepositoryStore.getState().fetchRepositories(" octocat ");

    expect(fetchUserRepositoriesMock).toHaveBeenCalledWith("octocat");
    expect(useRepositoryStore.getState()).toMatchObject({
      username: "octocat",
      repositories: [repository],
      status: "success",
      error: null,
    });
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
