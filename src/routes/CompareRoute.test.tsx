import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { analyzeRepository } from "@/modules/analyzer-core";
import { copy } from "@/lib/copy";
import { useComparisonStore } from "@/store/comparisonStore";
import { useRepositoryStore } from "@/store/repositoryStore";
import { CompareRoute } from "./CompareRoute";
import type { Repository, RepositoryReadmeState } from "@/types";

const missingReadme: RepositoryReadmeState = { status: "missing" };

const baseRepository: Repository = {
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

beforeEach(() => {
  useRepositoryStore.getState().reset();
  useComparisonStore.getState().clear();
});

describe("CompareRoute", () => {
  it("renders the empty comparison state from shared copy", () => {
    renderCompareRoute();

    expect(screen.getByRole("heading", { name: copy.compare.title })).toBeInTheDocument();
    expect(screen.getByText(copy.compare.empty.title)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: copy.compare.empty.action })).toBeInTheDocument();
  });

  it("renders selected repositories and removes a comparison column", async () => {
    const user = userEvent.setup();
    seedComparisons();

    renderCompareRoute();

    expect(screen.getByRole("link", { name: "openready" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "portfolio-kit" })).toBeInTheDocument();
    expect(screen.getAllByText(copy.compare.column.topGaps)).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: copy.compare.column.remove("openready") }));

    expect(screen.queryByRole("link", { name: "openready" })).not.toBeInTheDocument();
    expect(screen.getByText(copy.compare.empty.title)).toBeInTheDocument();
  });
});

function seedComparisons() {
  const repositories = [
    baseRepository,
    {
      ...baseRepository,
      id: "2",
      name: "portfolio-kit",
      fullName: "octocat/portfolio-kit",
      stars: 2,
      forks: 0,
    },
  ];
  const analyses = repositories.map((repository) =>
    analyzeRepository(repository, missingReadme, undefined, new Date("2026-05-28T12:00:00Z")),
  );

  useRepositoryStore.setState({
    username: "octocat",
    repositories,
    analyses,
    status: "success",
    readmeStatus: "complete",
    treeStatus: "complete",
    error: null,
  });
  useComparisonStore.setState({ selectedIds: repositories.map((repository) => repository.id) });
}

function renderCompareRoute() {
  return render(
    <MemoryRouter initialEntries={["/dashboard/compare"]}>
      <Routes>
        <Route path="/dashboard/compare" element={<CompareRoute />} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}
