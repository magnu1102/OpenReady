import { setGitHubAuthToken } from "@/modules/github-client";

/**
 * Resolve a GitHub token from the CLI flag, then the OpenReady-specific env
 * var, then the conventional GITHUB_TOKEN. Returns the resolved token (or null)
 * and applies it to the GitHub client so subsequent fetches carry it.
 */
export function applyGitHubAuth(flagToken: string | null, env: NodeJS.ProcessEnv): string | null {
  const candidates = [flagToken, env.OPENREADY_GITHUB_TOKEN, env.GITHUB_TOKEN];
  for (const candidate of candidates) {
    if (candidate && candidate.trim().length > 0) {
      const trimmed = candidate.trim();
      setGitHubAuthToken(trimmed);
      return trimmed;
    }
  }
  setGitHubAuthToken(null);
  return null;
}
