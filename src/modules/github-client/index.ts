import type { Repository, RepositoryReadme, RepositoryTree, RepositoryTreeEntry } from "@/types";

const GITHUB_API_BASE_URL = "https://api.github.com";
const USERNAME_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

export type GitHubClientErrorCode =
  | "invalid-username"
  | "not-found"
  | "rate-limit"
  | "network"
  | "invalid-response"
  | "api-error";

export class GitHubClientError extends Error {
  constructor(
    public readonly code: GitHubClientErrorCode,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "GitHubClientError";
  }
}

interface GitHubRepositoryResponse {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics?: string[];
  license: {
    key: string;
    name: string;
    spdx_id: string | null;
    url: string | null;
  } | null;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  archived: boolean;
  fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
}

interface GitHubReadmeResponse {
  path: string;
  html_url: string;
  content: string;
  encoding: string;
}

interface GitHubTreeResponse {
  tree: Array<{ path?: unknown; type?: unknown }>;
  truncated: boolean;
}

interface GitHubHttpResponse {
  ok: boolean;
  status: number;
  headers: {
    get: (name: string) => string | null;
  };
  json: () => Promise<unknown>;
}

interface GitHubProxyResponse {
  status: number;
  body: string;
  rate_limit_remaining: string | null;
}

export function normalizeGitHubUsername(username: string): string {
  return username.trim();
}

export function isValidGitHubUsername(username: string): boolean {
  return USERNAME_PATTERN.test(normalizeGitHubUsername(username));
}

export async function fetchUserRepositories(username: string): Promise<Repository[]> {
  const normalized = normalizeGitHubUsername(username);
  if (!isValidGitHubUsername(normalized)) {
    throw new GitHubClientError(
      "invalid-username",
      "Enter a valid GitHub username using letters, numbers, or single hyphens.",
    );
  }

  const response = await githubGet(
    `/users/${encodeURIComponent(normalized)}/repos`,
    [
      ["sort", "pushed"],
      ["direction", "desc"],
      ["per_page", "100"],
    ],
    "Could not reach GitHub. Check your connection and try again.",
  );

  if (!response.ok) {
    throw await toGitHubClientError(response);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new GitHubClientError(
      "invalid-response",
      "GitHub returned an unexpected response. Try again later.",
    );
  }

  return data.map(mapRepository);
}

export async function fetchRepositoryReadme(
  owner: string,
  repo: string,
): Promise<RepositoryReadme | null> {
  const normalizedOwner = owner.trim();
  const normalizedRepo = repo.trim();
  if (
    !normalizedOwner ||
    !normalizedRepo ||
    normalizedOwner.includes("/") ||
    normalizedRepo.includes("/")
  ) {
    throw new GitHubClientError("invalid-username", "Enter a valid repository owner and name.");
  }

  const path = `/repos/${encodeURIComponent(normalizedOwner)}/${encodeURIComponent(
    normalizedRepo,
  )}/readme`;

  const response = await githubGet(path, [], "Could not reach GitHub while checking the README.");

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw await toGitHubClientError(response);
  }

  const data: unknown = await response.json();
  if (!isGitHubReadmeResponse(data) || data.encoding !== "base64") {
    throw new GitHubClientError(
      "invalid-response",
      "GitHub returned an unexpected README response.",
    );
  }

  return {
    repositoryFullName: `${normalizedOwner}/${normalizedRepo}`,
    path: data.path,
    htmlUrl: data.html_url,
    content: decodeBase64(data.content),
  };
}

export async function fetchRepositoryTree(
  owner: string,
  repo: string,
  branch: string,
): Promise<RepositoryTree | null> {
  const normalizedOwner = owner.trim();
  const normalizedRepo = repo.trim();
  const normalizedBranch = branch.trim();
  if (
    !normalizedOwner ||
    !normalizedRepo ||
    !normalizedBranch ||
    normalizedOwner.includes("/") ||
    normalizedRepo.includes("/")
  ) {
    throw new GitHubClientError(
      "invalid-username",
      "Enter a valid repository owner, name, and branch.",
    );
  }

  const path = `/repos/${encodeURIComponent(normalizedOwner)}/${encodeURIComponent(
    normalizedRepo,
  )}/git/trees/${encodeURIComponent(normalizedBranch)}`;

  const response = await githubGet(
    path,
    [["recursive", "1"]],
    "Could not reach GitHub while checking the repository file tree.",
  );

  if (response.status === 404 || response.status === 409) {
    return null;
  }

  if (!response.ok) {
    throw await toGitHubClientError(response);
  }

  const data: unknown = await response.json();
  if (!isGitHubTreeResponse(data)) {
    throw new GitHubClientError(
      "invalid-response",
      "GitHub returned an unexpected repository tree response.",
    );
  }

  const entries: RepositoryTreeEntry[] = [];
  for (const entry of data.tree) {
    if (typeof entry.path === "string" && (entry.type === "blob" || entry.type === "tree")) {
      entries.push({ path: entry.path, type: entry.type });
    }
  }

  return {
    repositoryFullName: `${normalizedOwner}/${normalizedRepo}`,
    entries,
    truncated: data.truncated,
  };
}

async function githubGet(
  path: string,
  query: Array<[string, string]>,
  networkMessage: string,
): Promise<GitHubHttpResponse> {
  if (isTauriRuntime()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const response = await invoke<GitHubProxyResponse>("github_get", {
        input: { path, query },
      });
      return toProxyHttpResponse(response);
    } catch (error) {
      throw new GitHubClientError("network", errorMessage(error) || networkMessage);
    }
  }

  const url = new URL(path, GITHUB_API_BASE_URL);
  for (const [key, value] of query) {
    url.searchParams.set(key, value);
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (cliAuthToken) {
    headers.Authorization = `Bearer ${cliAuthToken}`;
  }

  try {
    return await fetch(url, { headers });
  } catch {
    throw new GitHubClientError("network", networkMessage);
  }
}

let cliAuthToken: string | null = null;

/**
 * Attach a GitHub personal access token to the plain `fetch` path used
 * outside the Tauri runtime (notably the CLI). Pass `null` to clear it.
 * Has no effect on the Tauri proxy path, which manages auth in Rust.
 */
export function setGitHubAuthToken(token: string | null): void {
  cliAuthToken = token && token.trim().length > 0 ? token.trim() : null;
}

function toProxyHttpResponse(response: GitHubProxyResponse): GitHubHttpResponse {
  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    headers: {
      get: (name) =>
        name.toLowerCase() === "x-ratelimit-remaining" ? response.rate_limit_remaining : null,
    },
    json: async () => JSON.parse(response.body) as unknown,
  };
}

async function toGitHubClientError(response: GitHubHttpResponse): Promise<GitHubClientError> {
  const message = await readGitHubErrorMessage(response);
  if (response.status === 404) {
    return new GitHubClientError(
      "not-found",
      "No GitHub user was found for that username.",
      response.status,
    );
  }

  if (response.status === 403 && isRateLimitResponse(response, message)) {
    return new GitHubClientError(
      "rate-limit",
      "GitHub rate limit reached. Wait a while and try again.",
      response.status,
    );
  }

  return new GitHubClientError(
    "api-error",
    message || "GitHub could not complete the request. Try again later.",
    response.status,
  );
}

async function readGitHubErrorMessage(response: GitHubHttpResponse): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message === "string"
    ) {
      return body.message;
    }
  } catch {
    return "";
  }
  return "";
}

function isRateLimitResponse(response: GitHubHttpResponse, message: string): boolean {
  return (
    response.headers.get("x-ratelimit-remaining") === "0" ||
    message.toLowerCase().includes("rate limit")
  );
}

function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "";
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function mapRepository(repo: GitHubRepositoryResponse): Repository {
  return {
    id: String(repo.id),
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    url: repo.html_url,
    homepageUrl: repo.homepage || null,
    language: repo.language,
    topics: repo.topics ?? [],
    license: repo.license
      ? {
          key: repo.license.key,
          name: repo.license.name,
          spdxId: repo.license.spdx_id,
          url: repo.license.url,
        }
      : null,
    defaultBranch: repo.default_branch,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    archived: repo.archived,
    fork: repo.fork,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
  };
}

function isGitHubTreeResponse(value: unknown): value is GitHubTreeResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "tree" in value &&
    Array.isArray((value as { tree: unknown }).tree) &&
    "truncated" in value &&
    typeof (value as { truncated: unknown }).truncated === "boolean"
  );
}

function isGitHubReadmeResponse(value: unknown): value is GitHubReadmeResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "path" in value &&
    typeof value.path === "string" &&
    "html_url" in value &&
    typeof value.html_url === "string" &&
    "content" in value &&
    typeof value.content === "string" &&
    "encoding" in value &&
    typeof value.encoding === "string"
  );
}

function decodeBase64(content: string): string {
  const binary = atob(content.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
