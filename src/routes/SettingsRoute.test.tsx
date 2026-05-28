import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { clearAnalysisCache } from "@/lib/analysisCache";
import {
  deleteGitHubToken,
  getGitHubTokenStatus,
  validateAndStoreGitHubToken,
} from "@/lib/githubAuth";
import { useRepositoryStore } from "@/store/repositoryStore";
import { SettingsRoute } from "./SettingsRoute";

vi.mock("@/lib/githubAuth", () => ({
  deleteGitHubToken: vi.fn(),
  getGitHubTokenStatus: vi.fn(),
  validateAndStoreGitHubToken: vi.fn(),
}));

const getGitHubTokenStatusMock = vi.mocked(getGitHubTokenStatus);
const validateAndStoreGitHubTokenMock = vi.mocked(validateAndStoreGitHubToken);
const deleteGitHubTokenMock = vi.mocked(deleteGitHubToken);

beforeEach(async () => {
  await clearAnalysisCache();
  useRepositoryStore.getState().reset();
  getGitHubTokenStatusMock.mockReset();
  getGitHubTokenStatusMock.mockResolvedValue({ configured: false, available: true });
  validateAndStoreGitHubTokenMock.mockReset();
  validateAndStoreGitHubTokenMock.mockResolvedValue({ configured: true, available: true });
  deleteGitHubTokenMock.mockReset();
  deleteGitHubTokenMock.mockResolvedValue({ configured: false, available: true });
});

describe("SettingsRoute", () => {
  it("validates and stores a GitHub token from Settings", async () => {
    const user = userEvent.setup();

    render(<SettingsRoute />);

    expect(await screen.findByText("No token is configured.")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/github_pat/i), "ghp_test");
    await user.click(screen.getByRole("button", { name: /save token/i }));

    expect(validateAndStoreGitHubTokenMock).toHaveBeenCalledWith("ghp_test");
    expect(await screen.findByText("GitHub token saved.")).toBeInTheDocument();
  });

  it("removes an existing GitHub token", async () => {
    const user = userEvent.setup();
    getGitHubTokenStatusMock.mockResolvedValueOnce({ configured: true, available: true });

    render(<SettingsRoute />);

    expect(
      await screen.findByText("A token is configured in the operating system credential store."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /remove/i }));

    expect(deleteGitHubTokenMock).toHaveBeenCalledOnce();
    expect(await screen.findByText("GitHub token removed.")).toBeInTheDocument();
  });

  it("clears the local analysis cache", async () => {
    const user = userEvent.setup();
    render(<SettingsRoute />);

    await screen.findByText("Empty");
    act(() => {
      useRepositoryStore.setState({
        cachedAnalyses: [
          {
            username: "octocat",
            repositoryCount: 1,
            fetchedAt: "2026-05-28T10:00:00.000Z",
            savedAt: "2026-05-28T10:00:00.000Z",
            isStale: false,
          },
        ],
      });
    });
    expect(await screen.findByText("1 saved")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /clear cache/i }));

    expect(screen.getByText("Empty")).toBeInTheDocument();
  });
});
