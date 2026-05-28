import { describe, it, expect, vi, afterEach } from "vitest";
import type { GitHubClientError } from "./index";
import { fetchRepositoryReadme, fetchUserRepositories, isValidGitHubUsername } from "./index";

const fetchMock = vi.fn<typeof fetch>();

vi.stubGlobal("fetch", fetchMock);

afterEach(() => {
  fetchMock.mockReset();
});

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });
}

describe("github-client", () => {
  it("validates basic GitHub usernames", () => {
    expect(isValidGitHubUsername("octocat")).toBe(true);
    expect(isValidGitHubUsername("open-ai")).toBe(true);
    expect(isValidGitHubUsername("two words")).toBe(false);
    expect(isValidGitHubUsername("https://github.com/octocat")).toBe(false);
    expect(isValidGitHubUsername("-leading")).toBe(false);
  });

  it("fetches the first 100 user repositories sorted by recently pushed", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          id: 1,
          name: "hello-world",
          full_name: "octocat/hello-world",
          description: "My first repo",
          html_url: "https://github.com/octocat/hello-world",
          homepage: "https://example.com",
          language: "TypeScript",
          topics: ["desktop", "github"],
          license: {
            key: "mit",
            name: "MIT License",
            spdx_id: "MIT",
            url: "https://api.github.com/licenses/mit",
          },
          default_branch: "main",
          stargazers_count: 42,
          forks_count: 7,
          archived: false,
          fork: true,
          created_at: "2025-05-28T10:00:00Z",
          updated_at: "2026-05-28T10:00:00Z",
          pushed_at: "2026-05-28T09:00:00Z",
        },
      ]),
    );

    const repos = await fetchUserRepositories(" octocat ");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      "https://api.github.com/users/octocat/repos?sort=pushed&direction=desc&per_page=100",
    );
    expect(init).toMatchObject({
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    expect(repos).toEqual([
      {
        id: "1",
        name: "hello-world",
        fullName: "octocat/hello-world",
        description: "My first repo",
        url: "https://github.com/octocat/hello-world",
        homepageUrl: "https://example.com",
        language: "TypeScript",
        topics: ["desktop", "github"],
        license: {
          key: "mit",
          name: "MIT License",
          spdxId: "MIT",
          url: "https://api.github.com/licenses/mit",
        },
        defaultBranch: "main",
        stars: 42,
        forks: 7,
        archived: false,
        fork: true,
        createdAt: "2025-05-28T10:00:00Z",
        updatedAt: "2026-05-28T10:00:00Z",
        pushedAt: "2026-05-28T09:00:00Z",
      },
    ]);
  });

  it("throws not-found for missing users", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "Not Found" }, { status: 404 }));

    await expect(fetchUserRepositories("missing-user")).rejects.toMatchObject({
      code: "not-found",
      status: 404,
    } satisfies Partial<GitHubClientError>);
  });

  it("throws rate-limit when GitHub reports no remaining requests", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { message: "API rate limit exceeded" },
        { status: 403, headers: { "x-ratelimit-remaining": "0" } },
      ),
    );

    await expect(fetchUserRepositories("octocat")).rejects.toMatchObject({
      code: "rate-limit",
      status: 403,
    } satisfies Partial<GitHubClientError>);
  });

  it("throws network when fetch rejects", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(fetchUserRepositories("octocat")).rejects.toMatchObject({
      code: "network",
    } satisfies Partial<GitHubClientError>);
  });

  it("throws invalid-response for non-array successful responses", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "ok" }));

    await expect(fetchUserRepositories("octocat")).rejects.toMatchObject({
      code: "invalid-response",
    } satisfies Partial<GitHubClientError>);
  });

  it("rejects invalid usernames before calling GitHub", async () => {
    await expect(fetchUserRepositories("octocat/repo")).rejects.toMatchObject({
      code: "invalid-username",
    } satisfies Partial<GitHubClientError>);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches and decodes repository README content", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        path: "README.md",
        html_url: "https://github.com/octocat/hello-world/blob/main/README.md",
        content: "IyBIZWxsbyBXb3JsZAoKUnVuIGl0IGxvY2FsbHku",
        encoding: "base64",
      }),
    );

    const readme = await fetchRepositoryReadme("octocat", "hello-world");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.github.com/repos/octocat/hello-world/readme");
    expect(init).toMatchObject({
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    expect(readme).toEqual({
      repositoryFullName: "octocat/hello-world",
      path: "README.md",
      htmlUrl: "https://github.com/octocat/hello-world/blob/main/README.md",
      content: "# Hello World\n\nRun it locally.",
    });
  });

  it("returns null when a repository README is missing", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "Not Found" }, { status: 404 }));

    await expect(fetchRepositoryReadme("octocat", "empty")).resolves.toBeNull();
  });

  it("throws rate-limit when README fetch is rate limited", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { message: "API rate limit exceeded" },
        { status: 403, headers: { "x-ratelimit-remaining": "0" } },
      ),
    );

    await expect(fetchRepositoryReadme("octocat", "hello-world")).rejects.toMatchObject({
      code: "rate-limit",
      status: 403,
    } satisfies Partial<GitHubClientError>);
  });

  it("throws network when README fetch rejects", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(fetchRepositoryReadme("octocat", "hello-world")).rejects.toMatchObject({
      code: "network",
    } satisfies Partial<GitHubClientError>);
  });

  it("throws invalid-response for malformed README responses", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "ok" }));

    await expect(fetchRepositoryReadme("octocat", "hello-world")).rejects.toMatchObject({
      code: "invalid-response",
    } satisfies Partial<GitHubClientError>);
  });
});
