export interface AiConfigStatus {
  /** True when an API key is stored in the operating system credential store. */
  configured: boolean;
  /** True when secure storage and the AI bridge are available (desktop app). */
  available: boolean;
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
}

const DESKTOP_ONLY_MESSAGE = "AI features are available in the OpenReady desktop app.";

export async function getAiConfigStatus(): Promise<AiConfigStatus> {
  if (!isTauriRuntime()) return { configured: false, available: false };
  const status = await invokeAiCommand<NativeAiConfigStatus>("get_ai_config_status");
  return { ...status, available: true };
}

export async function validateAndStoreAiConfig(key: string): Promise<AiConfigStatus> {
  if (!isTauriRuntime()) throw new Error(DESKTOP_ONLY_MESSAGE);
  const status = await invokeAiCommand<NativeAiConfigStatus>("store_ai_config", { key });
  return { ...status, available: true };
}

export async function deleteAiConfig(): Promise<AiConfigStatus> {
  if (!isTauriRuntime()) throw new Error(DESKTOP_ONLY_MESSAGE);
  const status = await invokeAiCommand<NativeAiConfigStatus>("delete_ai_config");
  return { ...status, available: true };
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
  if (result.status === 401 || result.status === 403) {
    return "The AI provider rejected the API key. Check the key in Settings.";
  }
  if (result.status === 404) {
    return "The AI provider could not find that endpoint. Check the base URL and model in Settings.";
  }
  if (result.status === 429) {
    return "The AI provider is rate-limiting requests. Wait a moment and try again.";
  }
  const detail = extractProviderError(result.body);
  return detail
    ? `The AI provider returned an error: ${detail}`
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

function extractProviderError(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: unknown } };
    const message = parsed.error?.message;
    return typeof message === "string" ? message : null;
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
