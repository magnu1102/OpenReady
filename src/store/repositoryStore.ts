import { create } from "zustand";
import { fetchUserRepositories, GitHubClientError } from "@/modules/github-client";
import type { GitHubClientErrorCode } from "@/modules/github-client";
import type { Repository } from "@/types";

export type RepositoryFetchStatus = "idle" | "loading" | "success" | "error";

export interface RepositoryFetchError {
  code: GitHubClientErrorCode;
  message: string;
}

interface RepositoryState {
  username: string;
  repositories: Repository[];
  status: RepositoryFetchStatus;
  error: RepositoryFetchError | null;
  fetchRepositories: (username: string) => Promise<void>;
  reset: () => void;
}

const initialState = {
  username: "",
  repositories: [],
  status: "idle" as const,
  error: null,
};

export const useRepositoryStore = create<RepositoryState>((set) => ({
  ...initialState,
  fetchRepositories: async (username) => {
    const normalized = username.trim();
    set({ username: normalized, repositories: [], status: "loading", error: null });

    try {
      const repositories = await fetchUserRepositories(normalized);
      set({ repositories, status: "success", error: null });
    } catch (error) {
      const repositoryError = toRepositoryFetchError(error);
      set({ repositories: [], status: "error", error: repositoryError });
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
