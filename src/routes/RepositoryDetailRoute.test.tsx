import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { copy } from "@/lib/copy";
import { analyzeRepository } from "@/modules/analyzer-core";
import { useRepositoryStore, type TreeFetchStatus } from "@/store/repositoryStore";
import { RepositoryDetailRoute } from "./RepositoryDetailRoute";
import type { Repository, RepositoryReadmeState, RepositoryTreeState } from "@/types";

const repository: Repository = {
  id: "1",
  name: "openready",
  fullName: "octocat/openready",
  description: "Repository health desktop app",
  url: "https://github.com/octocat/openready",
  homepageUrl: null,
  language: "TypeScript",
  topics: ["desktop", "github"],
  license: null,
  defaultBranch: "main",
  stars: 12,
  forks: 3,
  archived: false,
  fork: false,
  createdAt: "2025-05-28T10:00:00Z",
  updatedAt: "2026-05-28T10:00:00Z",
  pushedAt: "2026-05-28T09:00:00Z",
};

const completeReadme: RepositoryReadmeState = {
  status: "found",
  readme: {
    repositoryFullName: "octocat/openready",
    path: "README.md",
    htmlUrl: "https://github.com/octocat/openready/blob/main/README.md",
    content: `# OpenReady

## Overview

OpenReady helps developers understand repository readiness.

## Installation

pnpm install

## Usage

pnpm dev

## Screenshots

![Dashboard](./dashboard.png)

## Tech Stack

React, TypeScript and Tauri.

## Testing

pnpm test

## Roadmap

Export support is next.`,
  },
};

const detectedTree: RepositoryTreeState = {
  status: "found",
  tree: {
    repositoryFullName: "octocat/openready",
    truncated: false,
    entries: [
      { path: "package.json", type: "blob" },
      { path: "pnpm-lock.yaml", type: "blob" },
      { path: ".github/workflows/ci.yml", type: "blob" },
      { path: "src/App.test.tsx", type: "blob" },
      { path: "src-tauri/tauri.conf.json", type: "blob" },
      { path: "Dockerfile", type: "blob" },
      { path: "docs/architecture.md", type: "blob" },
      { path: "SECURITY.md", type: "blob" },
      { path: ".env.example", type: "blob" },
    ],
  },
};

beforeEach(() => {
  useRepositoryStore.getState().reset();
});

describe("RepositoryDetailRoute", () => {
  it("renders the repository header, score summary and detected stack", () => {
    seedRepositoryState(completeReadme, detectedTree);

    renderDetailRoute();

    expect(screen.getByRole("heading", { name: "openready" })).toBeInTheDocument();
    expect(screen.getByText("Repository health desktop app")).toBeInTheDocument();
    expect(screen.getByText(copy.repoDetail.summary.heading)).toBeInTheDocument();
    expect(screen.getByText(copy.repoDetail.summary.scoringNote)).toBeInTheDocument();
    expect(screen.getAllByText(/\d+ score . \d+\/\d+ checks/).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: copy.repoDetail.summary.weightTitle(1.5) }),
    ).toBeInTheDocument();
    expect(screen.getByText(copy.repoDetail.techStack.title)).toBeInTheDocument();
    expect(screen.getByText("Node.js")).toBeInTheDocument();
  });

  it("shows documentation, build, security, presentation and recommendation tabs", async () => {
    const user = userEvent.setup();
    seedRepositoryState(completeReadme, detectedTree);

    renderDetailRoute();

    await user.click(screen.getByRole("tab", { name: copy.repoDetail.tabs.documentation.label }));
    expect(screen.getByText("README exists")).toBeInTheDocument();
    expect(screen.getByText("Repository ships a dedicated docs/ folder")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: copy.repoDetail.tabs.build.label }));
    expect(screen.getByText("Repository declares a build manifest")).toBeInTheDocument();
    expect(screen.getByText("GitHub Actions workflows are configured")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: copy.repoDetail.tabs.security.label }));
    expect(screen.getByText("Repository ships a SECURITY.md")).toBeInTheDocument();
    expect(screen.getByText("Repository ships an example env file")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: copy.repoDetail.tabs.presentation.label }));
    expect(screen.getByText("README includes screenshots or demo")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: copy.repoDetail.tabs.recommendations.label }));
    expect(screen.getByText("Add a license")).toBeInTheDocument();
    expect(screen.getByText("Link to a homepage or demo")).toBeInTheDocument();
  });

  it("shows a recovery state when repository details are no longer in memory", () => {
    renderDetailRoute("missing");

    expect(screen.getByText(copy.repoDetail.unavailable.title)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: copy.repoDetail.unavailable.action }),
    ).toBeInTheDocument();
  });

  it("renders README and tree unavailable states clearly", async () => {
    const user = userEvent.setup();
    seedRepositoryState(
      { status: "unknown", message: "GitHub rate limit reached." },
      undefined,
      "complete",
    );

    renderDetailRoute();

    expect(screen.getByText(copy.repoDetail.techStack.unavailable)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: copy.repoDetail.tabs.documentation.label }));
    expect(screen.getAllByText("GitHub rate limit reached.").length).toBeGreaterThan(0);
  });

  it("renders missing README and empty repository tree evidence", async () => {
    const user = userEvent.setup();
    seedRepositoryState({ status: "missing" }, { status: "empty" });

    renderDetailRoute();

    expect(screen.getByText(copy.repoDetail.techStack.empty)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: copy.repoDetail.tabs.documentation.label }));
    expect(screen.getByText("No README found")).toBeInTheDocument();
  });
});

function seedRepositoryState(
  readmeState: RepositoryReadmeState,
  treeState: RepositoryTreeState | undefined,
  treeStatus: TreeFetchStatus = "complete",
) {
  useRepositoryStore.setState({
    username: "octocat",
    repositories: [repository],
    readmes: { [repository.id]: readmeState },
    trees: treeState ? { [repository.id]: treeState } : {},
    analyses: [
      analyzeRepository(repository, readmeState, treeState, new Date("2026-05-28T12:00:00Z")),
    ],
    status: "success",
    readmeStatus: "complete",
    treeStatus,
    error: null,
  });
}

function renderDetailRoute(id = repository.id) {
  return render(
    <MemoryRouter initialEntries={[`/dashboard/repo/${id}`]}>
      <TooltipProvider>
        <Routes>
          <Route path="/dashboard/repo/:id" element={<RepositoryDetailRoute />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
          <Route path="/" element={<div>Welcome</div>} />
        </Routes>
      </TooltipProvider>
    </MemoryRouter>,
  );
}
