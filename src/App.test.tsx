import { beforeEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import {
  fetchRepositoryReadme,
  fetchRepositoryTree,
  fetchUserRepositories,
  GitHubClientError,
} from "@/modules/github-client";
import { clearAnalysisCache } from "@/lib/analysisCache";
import { copy } from "@/lib/copy";
import { repositoryFixture } from "@/test/fixtures/repository";
import { saveExportFile } from "@/lib/exportFiles";
import { useRepositoryStore } from "@/store/repositoryStore";
import type { Repository } from "@/types";

vi.mock("@/modules/github-client", async (importOriginal) => {
  const actual = await importOriginal();
  const fetchUserRepositories = vi.fn();
  const fetchRepositoryReadme = vi.fn();
  const fetchRepositoryTree = vi.fn();
  const metadata = (requestKey: string) => ({
    status: 200,
    etag: null,
    requestKey,
    rateLimit: { limit: null, remaining: null, used: null, reset: null },
  });
  return {
    ...(actual as object),
    fetchRepositoryReadme,
    fetchRepositoryTree,
    fetchUserRepositories,
    fetchUserRepositoriesWithMetadata: vi.fn(async (username: string) => ({
      data: await fetchUserRepositories(username),
      notModified: false,
      metadata: metadata("repository-list"),
    })),
    fetchRepositoryReadmeWithMetadata: vi.fn(async (owner: string, repo: string) => ({
      data: await fetchRepositoryReadme(owner, repo),
      notModified: false,
      metadata: metadata(`readme:${owner}/${repo}`),
    })),
    fetchRepositoryTreeWithMetadata: vi.fn(async (owner: string, repo: string, branch: string) => ({
      data: await fetchRepositoryTree(owner, repo, branch),
      notModified: false,
      metadata: metadata(`tree:${owner}/${repo}/${branch}`),
    })),
  };
});

vi.mock("@/lib/exportFiles", () => ({
  saveExportFile: vi.fn(),
}));

const fetchUserRepositoriesMock = vi.mocked(fetchUserRepositories);
const fetchRepositoryReadmeMock = vi.mocked(fetchRepositoryReadme);
const fetchRepositoryTreeMock = vi.mocked(fetchRepositoryTree);
const saveExportFileMock = vi.mocked(saveExportFile);

const repository: Repository = repositoryFixture;

beforeEach(async () => {
  await clearAnalysisCache();
  useRepositoryStore.getState().reset();
  fetchUserRepositoriesMock.mockReset();
  fetchRepositoryReadmeMock.mockReset();
  fetchRepositoryReadmeMock.mockResolvedValue(null);
  fetchRepositoryTreeMock.mockReset();
  fetchRepositoryTreeMock.mockResolvedValue(null);
  saveExportFileMock.mockReset();
  saveExportFileMock.mockResolvedValue({ status: "saved", path: "C:/Users/octocat/report.md" });
});

describe("App", () => {
  it("renders the Welcome route at the initial entry", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: copy.welcome.heading })).toBeInTheDocument();
  });

  it("renders the sidebar with primary navigation", () => {
    render(<App />);
    const nav = screen.getByRole("navigation", { name: /primary/i });
    expect(nav).toBeInTheDocument();
  });

  it("fetches repositories from the Welcome form and renders dashboard cards", async () => {
    const user = userEvent.setup();
    fetchUserRepositoriesMock.mockResolvedValueOnce([repository]);

    render(<App />);

    await user.type(screen.getByLabelText(/github user or organization/i), "octocat");
    await user.click(screen.getByRole("button", { name: /analyze/i }));

    expect(await screen.findByRole("heading", { name: copy.dashboard.title })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "openready" })).toBeInTheDocument();
    expect(screen.getByText("octocat/openready")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getAllByText("Fork").length).toBeGreaterThan(0);
  });

  it("renders dashboard export actions and saves a Markdown report", async () => {
    const user = userEvent.setup();
    fetchUserRepositoriesMock.mockResolvedValueOnce([{ ...repository, fork: false }]);

    render(<App />);

    await user.type(screen.getByLabelText(/github user or organization/i), "octocat");
    await user.click(screen.getByRole("button", { name: /analyze/i }));

    expect(
      await screen.findByRole("heading", { name: copy.dashboard.exportPanel.heading }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: copy.dashboard.exportPanel.markdown }));

    expect(saveExportFileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        format: "markdown",
        defaultPath: "octocat-openready-report.md",
        content: expect.stringContaining("# OpenReady report for octocat"),
      }),
    );
    expect(
      await within(screen.getByRole("status")).findByText(copy.toasts.exportSaved),
    ).toBeInTheDocument();
  });

  it("restores a recent cached analysis from the Welcome screen", async () => {
    const user = userEvent.setup();
    fetchUserRepositoriesMock.mockResolvedValueOnce([{ ...repository, fork: false }]);

    render(<App />);

    await user.type(screen.getByLabelText(/github user or organization/i), "octocat");
    await user.click(screen.getByRole("button", { name: /analyze/i }));

    await waitFor(() => {
      expect(useRepositoryStore.getState().activeCache).not.toBeNull();
    });
    useRepositoryStore.getState().reset();

    await user.click(screen.getByRole("link", { name: /welcome/i }));
    expect(await screen.findByText(/recent cache/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /open cached/i }));

    expect(await screen.findByRole("heading", { name: copy.dashboard.title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "openready" })).toBeInTheDocument();
  });

  it("shows an empty dashboard state when GitHub returns no public repositories", async () => {
    const user = userEvent.setup();
    fetchUserRepositoriesMock.mockResolvedValueOnce([]);

    render(<App />);

    await user.type(screen.getByLabelText(/github user or organization/i), "octocat");
    await user.click(screen.getByRole("button", { name: /analyze/i }));

    expect(await screen.findByText(copy.dashboard.empty.noReposTitle)).toBeInTheDocument();
  });

  it("shows an actionable dashboard error when the GitHub client fails", async () => {
    const user = userEvent.setup();
    fetchUserRepositoriesMock.mockRejectedValueOnce(
      new GitHubClientError(
        "not-found",
        "No GitHub user or organization was found for that login.",
        404,
      ),
    );

    render(<App />);

    await user.type(screen.getByLabelText(/github user or organization/i), "does-not-exist");
    await user.click(screen.getByRole("button", { name: /analyze/i }));

    expect(await screen.findByText(copy.dashboard.errors.notFound)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: copy.dashboard.errors.changeUsername }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.dashboard.errors.tryAgain }),
    ).toBeInTheDocument();
  });

  it("renders deterministic labels and repository check details", async () => {
    const user = userEvent.setup();
    const noReadmeRepository: Repository = {
      ...repository,
      id: "2",
      name: "no-readme",
      fullName: "octocat/no-readme",
      fork: false,
      forks: 0,
    };
    fetchUserRepositoriesMock.mockResolvedValueOnce([noReadmeRepository]);
    fetchRepositoryReadmeMock.mockResolvedValueOnce(null);

    render(<App />);

    await user.type(screen.getByLabelText(/github user or organization/i), "octocat");
    await user.click(screen.getByRole("button", { name: /analyze/i }));

    expect(await screen.findByText(/No README found/i)).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "no-readme" }));
    expect(await screen.findByRole("heading", { name: "no-readme" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /documentation/i }));
    expect(screen.getByText("README exists")).toBeInTheDocument();
    expect(screen.getAllByText("No README found").length).toBeGreaterThan(0);
  });

  it("routes the Repository breadcrumb back to the dashboard", async () => {
    const user = userEvent.setup();
    fetchUserRepositoriesMock.mockResolvedValueOnce([{ ...repository, fork: false }]);

    render(<App />);

    await user.type(screen.getByLabelText(/github user or organization/i), "octocat");
    await user.click(screen.getByRole("button", { name: /analyze/i }));
    await user.click(await screen.findByRole("link", { name: "openready" }));

    expect(await screen.findByRole("heading", { name: "openready" })).toBeInTheDocument();

    const breadcrumb = screen.getByRole("navigation", { name: /breadcrumb/i });
    await user.click(within(breadcrumb).getByRole("link", { name: copy.shell.topBar.repository }));

    expect(await screen.findByRole("heading", { name: copy.dashboard.title })).toBeInTheDocument();
    expect(screen.queryByText(copy.notFound.title)).not.toBeInTheDocument();
  });

  it("supports standard keyboard history navigation", async () => {
    const user = userEvent.setup();
    fetchUserRepositoriesMock.mockResolvedValueOnce([{ ...repository, fork: false }]);

    render(<App />);

    await user.type(screen.getByLabelText(/github user or organization/i), "octocat");
    await user.click(screen.getByRole("button", { name: /analyze/i }));
    await user.click(await screen.findByRole("link", { name: "openready" }));

    expect(await screen.findByRole("heading", { name: "openready" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "BrowserBack" });
    expect(await screen.findByRole("heading", { name: copy.dashboard.title })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "BrowserForward" });
    expect(await screen.findByRole("heading", { name: "openready" })).toBeInTheDocument();
  });

  it("supports mouse back and forward buttons", async () => {
    const user = userEvent.setup();
    fetchUserRepositoriesMock.mockResolvedValueOnce([{ ...repository, fork: false }]);

    render(<App />);

    await user.type(screen.getByLabelText(/github user or organization/i), "octocat");
    await user.click(screen.getByRole("button", { name: /analyze/i }));
    await user.click(await screen.findByRole("link", { name: "openready" }));

    expect(await screen.findByRole("heading", { name: "openready" })).toBeInTheDocument();

    fireEvent.mouseDown(window, { button: 3 });
    fireEvent.mouseUp(window, { button: 3 });
    expect(await screen.findByRole("heading", { name: copy.dashboard.title })).toBeInTheDocument();

    fireEvent.mouseDown(window, { button: 4 });
    fireEvent.mouseUp(window, { button: 4 });
    expect(await screen.findByRole("heading", { name: "openready" })).toBeInTheDocument();
  });
});
