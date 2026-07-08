/**
 * RAW GitHub REST wire-format payloads for Playwright route mocking — the
 * shape `GitHubRepositoryResponse` in src/modules/github-client/index.ts maps
 * from. The unit suite uses the mapped internal shape instead
 * (src/test/fixtures/repository.ts); keep the values aligned across both.
 */

export const rawRepositories = [
  {
    id: 1,
    name: "openready",
    full_name: "octocat/openready",
    description: "Repository health desktop app",
    html_url: "https://github.com/octocat/openready",
    homepage: "https://example.com/openready",
    language: "TypeScript",
    topics: ["desktop", "github"],
    license: {
      key: "mit",
      name: "MIT License",
      spdx_id: "MIT",
      url: "https://api.github.com/licenses/mit",
    },
    default_branch: "main",
    stargazers_count: 12,
    forks_count: 3,
    archived: false,
    fork: false,
    created_at: "2025-05-28T10:00:00Z",
    updated_at: "2026-05-28T10:00:00Z",
    pushed_at: "2026-05-28T09:00:00Z",
  },
];

export const rawOrganizationRepositories = [
  {
    ...rawRepositories[0],
    id: 2,
    name: "openready-org",
    full_name: "github/openready-org",
    html_url: "https://github.com/github/openready-org",
    owner: {
      login: "github",
      id: 9919,
      type: "Organization",
    },
  },
];

const readmeMarkdown = `# openready

A repository health desktop app.

## Setup

\`\`\`bash
pnpm install
\`\`\`

## Usage

Run the app and analyze a GitHub profile.
`;

export const rawReadme = {
  path: "README.md",
  html_url: "https://github.com/octocat/openready/blob/main/README.md",
  content: Buffer.from(readmeMarkdown, "utf8").toString("base64"),
  encoding: "base64",
};

export const rawTree = {
  truncated: false,
  tree: [
    { path: "README.md", type: "blob" },
    { path: "LICENSE", type: "blob" },
    { path: "package.json", type: "blob" },
    { path: "src/index.ts", type: "blob" },
    { path: "src/index.test.ts", type: "blob" },
    { path: ".github/workflows/ci.yml", type: "blob" },
  ],
};
