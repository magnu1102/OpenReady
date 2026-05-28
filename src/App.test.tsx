import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { fetchUserRepositories, GitHubClientError } from "@/modules/github-client";
import { useRepositoryStore } from "@/store/repositoryStore";
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
  homepageUrl: "https://repopulse.dev",
  language: "TypeScript",
  stars: 12,
  forks: 3,
  archived: false,
  fork: true,
  updatedAt: "2026-05-28T10:00:00Z",
  pushedAt: "2026-05-28T09:00:00Z",
};

beforeEach(() => {
  useRepositoryStore.getState().reset();
  fetchUserRepositoriesMock.mockReset();
});

describe("App", () => {
  it("renders the Welcome route at the initial entry", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /understand and improve/i })).toBeInTheDocument();
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

    await user.type(screen.getByLabelText(/github username/i), "octocat");
    await user.click(screen.getByRole("button", { name: /analyze/i }));

    expect(await screen.findByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "repopulse" })).toBeInTheDocument();
    expect(screen.getByText("octocat/repopulse")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Fork")).toBeInTheDocument();
  });

  it("shows an empty dashboard state when GitHub returns no public repositories", async () => {
    const user = userEvent.setup();
    fetchUserRepositoriesMock.mockResolvedValueOnce([]);

    render(<App />);

    await user.type(screen.getByLabelText(/github username/i), "octocat");
    await user.click(screen.getByRole("button", { name: /analyze/i }));

    expect(await screen.findByText(/no public repositories found/i)).toBeInTheDocument();
  });

  it("shows an actionable dashboard error when the GitHub client fails", async () => {
    const user = userEvent.setup();
    fetchUserRepositoriesMock.mockRejectedValueOnce(
      new GitHubClientError("not-found", "No GitHub user was found for that username.", 404),
    );

    render(<App />);

    await user.type(screen.getByLabelText(/github username/i), "does-not-exist");
    await user.click(screen.getByRole("button", { name: /analyze/i }));

    expect(await screen.findByText(/github user not found/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /change username/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});
