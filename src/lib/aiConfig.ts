export interface AiConfigStatus {
  /** True when an API key is stored in the operating system credential store. */
  configured: boolean;
  /** True when secure storage and the AI bridge are available (desktop app). */
  available: boolean;
  /** Masked preview of the stored key (e.g. `sk-proj-••••••••3a9f`), if any. */
  keyPreview?: string;
}

export interface AiVerifyResult {
  ok: boolean;
  message: string;
}

export interface AiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiChatOptions {
  baseUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AiChatResult {
  status: number;
  body: string;
}

interface NativeAiConfigStatus {
  configured: boolean;
  key_preview?: string | null;
}

const DESKTOP_ONLY_MESSAGE = "AI features are available in the OpenReady desktop app.";

function toStatus(native: NativeAiConfigStatus): AiConfigStatus {
  return {
    configured: native.configured,
    available: true,
    keyPreview: native.key_preview ?? undefined,
  };
}

export async function getAiConfigStatus(): Promise<AiConfigStatus> {
  if (!isTauriRuntime()) return { configured: false, available: false };
  return toStatus(await invokeAiCommand<NativeAiConfigStatus>("get_ai_config_status"));
}

export async function validateAndStoreAiConfig(key: string): Promise<AiConfigStatus> {
  if (!isTauriRuntime()) throw new Error(DESKTOP_ONLY_MESSAGE);
  return toStatus(await invokeAiCommand<NativeAiConfigStatus>("store_ai_config", { key }));
}

export async function deleteAiConfig(): Promise<AiConfigStatus> {
  if (!isTauriRuntime()) throw new Error(DESKTOP_ONLY_MESSAGE);
  return toStatus(await invokeAiCommand<NativeAiConfigStatus>("delete_ai_config"));
}

/**
 * Confirms the stored key and base URL actually work by hitting the provider's
 * `/models` endpoint (a read-only, token-free auth check). Surfaces the provider's
 * own error text so the user can tell an invalid key from, say, an unpaid account.
 */
export async function verifyAiConfig(baseUrl: string): Promise<AiVerifyResult> {
  if (!isTauriRuntime()) throw new Error(DESKTOP_ONLY_MESSAGE);
  const result = await invokeAiCommand<AiChatResult>("verify_ai_config", { baseUrl });
  if (result.status >= 200 && result.status < 300) {
    return { ok: true, message: "Key verified — the provider accepted it." };
  }
  return { ok: false, message: aiHttpErrorMessage(result) };
}

/**
 * Sends a chat completion request through the Rust proxy. The API key never
 * leaves the keychain — Rust reads it and attaches the Authorization header.
 * Returns the assistant's text, or throws a friendly error.
 */
export async function runAiChat(
  messages: AiChatMessage[],
  options: AiChatOptions,
): Promise<string> {
  if (!isTauriRuntime()) throw new Error(DESKTOP_ONLY_MESSAGE);
  const result = await invokeAiCommand<AiChatResult>("ai_chat", {
    input: {
      base_url: options.baseUrl,
      model: options.model,
      messages,
      temperature: options.temperature ?? null,
      max_tokens: options.maxTokens ?? null,
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(aiHttpErrorMessage(result));
  }
  return extractAssistantText(result.body);
}

function aiHttpErrorMessage(result: AiChatResult): string {
  const provider = extractProviderError(result.body);
  const detail = provider?.message ?? null;
  const withDetail = (base: string) => (detail ? `${base} ${detail}` : base);

  if (result.status === 401 || result.status === 403) {
    return withDetail(
      "The AI provider rejected the API key. Check that the key is correct, active, and pasted in full (no spaces).",
    );
  }
  if (result.status === 404) {
    return withDetail(
      "The AI provider could not find that endpoint. Check the base URL and model in Settings.",
    );
  }
  if (result.status === 429) {
    // Many providers reuse 429 for "out of credits" — surface that distinctly,
    // because a valid key with no billing is the most common false "rejection".
    if (provider?.type === "insufficient_quota" || /quota|billing|credit/i.test(detail ?? "")) {
      return withDetail(
        "The AI provider accepted the key but the account is out of credits or has no active billing.",
      );
    }
    return withDetail("The AI provider is rate-limiting requests. Wait a moment and try again.");
  }
  return detail
    ? `The AI provider returned an error (HTTP ${result.status}): ${detail}`
    : `The AI provider returned an error (HTTP ${result.status}).`;
}

/** Pulls the assistant text from an OpenAI-compatible chat completion body. */
function extractAssistantText(body: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("The AI provider returned a response OpenReady could not read.");
  }
  const choices = (parsed as { choices?: unknown }).choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const content = (choices[0] as { message?: { content?: unknown } }).message?.content;
    if (typeof content === "string" && content.trim().length > 0) return content.trim();
  }
  throw new Error("The AI provider returned an empty response.");
}

function extractProviderError(body: string): { message: string; type?: string } | null {
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: unknown; type?: unknown } | string;
    };
    const error = parsed.error;
    if (typeof error === "string") return { message: error };
    const message = error?.message;
    if (typeof message !== "string" || message.length === 0) return null;
    return {
      message,
      type: typeof error?.type === "string" ? error.type : undefined,
    };
  } catch {
    return null;
  }
}

async function invokeAiCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
