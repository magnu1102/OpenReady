import type { Repository } from "@/types";

/**
 * Internal-shape repository fixture for unit/integration tests that mock the
 * github-client module functions. The e2e suite mocks the network instead and
 * uses the RAW GitHub REST shape — keep values aligned with
 * e2e/fixtures/github.ts so both suites describe the same repository.
 */
export const repositoryFixture: Repository = {
  id: "1",
  name: "openready",
  fullName: "octocat/openready",
  description: "Repository health desktop app",
  url: "https://github.com/octocat/openready",
  homepageUrl: "https://example.com/openready",
  language: "TypeScript",
  topics: ["desktop", "github"],
  license: {
    key: "mit",
    name: "MIT License",
    spdxId: "MIT",
    url: "https://api.github.com/licenses/mit",
  },
  defaultBranch: "main",
  stars: 12,
  forks: 3,
  archived: false,
  fork: true,
  createdAt: "2025-05-28T10:00:00Z",
  updatedAt: "2026-05-28T10:00:00Z",
  pushedAt: "2026-05-28T09:00:00Z",
};
