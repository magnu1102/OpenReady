export interface GitHubTokenStatus {
  configured: boolean;
  available: boolean;
}

interface NativeTokenStatus {
  configured: boolean;
}

export async function getGitHubTokenStatus(): Promise<GitHubTokenStatus> {
  if (!isTauriRuntime()) return { configured: false, available: false };
  const status = await invokeTokenCommand<NativeTokenStatus>("get_github_token_status");
  return { ...status, available: true };
}

export async function validateAndStoreGitHubToken(token: string): Promise<GitHubTokenStatus> {
  if (!isTauriRuntime()) {
    throw new Error("GitHub token storage is available in the desktop app.");
  }
  const status = await invokeTokenCommand<NativeTokenStatus>("validate_and_store_github_token", {
    token,
  });
  return { ...status, available: true };
}

export async function deleteGitHubToken(): Promise<GitHubTokenStatus> {
  if (!isTauriRuntime()) {
    throw new Error("GitHub token storage is available in the desktop app.");
  }
  const status = await invokeTokenCommand<NativeTokenStatus>("delete_github_token");
  return { ...status, available: true };
}

async function invokeTokenCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
