import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Default base URL for an OpenAI-compatible provider. Users can point this at
 * OpenAI, Groq, OpenRouter, a local Ollama (`http://localhost:11434/v1`), etc.
 */
export const DEFAULT_AI_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_AI_MODEL = "gpt-4o-mini";

interface AiState {
  /** Master opt-in switch. AI never runs while this is false. */
  enabled: boolean;
  /** OpenAI-compatible base URL (non-secret). */
  baseUrl: string;
  /** Model name (non-secret). */
  model: string;
  setEnabled: (enabled: boolean) => void;
  setBaseUrl: (baseUrl: string) => void;
  setModel: (model: string) => void;
}

/**
 * Persists only non-secret AI configuration. The API key is NEVER stored here —
 * it lives in the operating system credential store via the Rust `store_ai_config`
 * command. `configured` (whether a key exists) is read separately from the keychain.
 */
export const useAiStore = create<AiState>()(
  persist(
    (set) => ({
      enabled: false,
      baseUrl: DEFAULT_AI_BASE_URL,
      model: DEFAULT_AI_MODEL,
      setEnabled: (enabled) => set({ enabled }),
      setBaseUrl: (baseUrl) => set({ baseUrl }),
      setModel: (model) => set({ model }),
    }),
    { name: "openready-ai" },
  ),
);
