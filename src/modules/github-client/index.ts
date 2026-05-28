import type { Repository } from "@/types";

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
  stargazers_count: number;
  forks_count: number;
  archived: boolean;
  fork: boolean;
  updated_at: string;
  pushed_at: string | null;
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

  const url = new URL(`/users/${normalized}/repos`, GITHUB_API_BASE_URL);
  url.searchParams.set("sort", "pushed");
  url.searchParams.set("direction", "desc");
  url.searchParams.set("per_page", "100");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  } catch {
    throw new GitHubClientError(
      "network",
      "Could not reach GitHub. Check your connection and try again.",
    );
  }

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

async function toGitHubClientError(response: Response): Promise<GitHubClientError> {
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

async function readGitHubErrorMessage(response: Response): Promise<string> {
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

function isRateLimitResponse(response: Response, message: string): boolean {
  return (
    response.headers.get("x-ratelimit-remaining") === "0" ||
    message.toLowerCase().includes("rate limit")
  );
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
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    archived: repo.archived,
    fork: repo.fork,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
  };
}
