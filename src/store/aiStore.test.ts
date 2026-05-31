import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_AI_BASE_URL, DEFAULT_AI_MODEL, useAiStore } from "./aiStore";

describe("aiStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useAiStore.setState({
      enabled: false,
      baseUrl: DEFAULT_AI_BASE_URL,
      model: DEFAULT_AI_MODEL,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("defaults to disabled with sensible provider defaults", () => {
    const state = useAiStore.getState();
    expect(state.enabled).toBe(false);
    expect(state.baseUrl).toBe(DEFAULT_AI_BASE_URL);
    expect(state.model).toBe(DEFAULT_AI_MODEL);
  });

  it("toggles and updates non-secret config", () => {
    useAiStore.getState().setEnabled(true);
    useAiStore.getState().setBaseUrl("http://localhost:11434/v1");
    useAiStore.getState().setModel("llama3");
    const state = useAiStore.getState();
    expect(state.enabled).toBe(true);
    expect(state.baseUrl).toBe("http://localhost:11434/v1");
    expect(state.model).toBe("llama3");
  });

  it("never writes an API key to persisted storage", () => {
    useAiStore.getState().setEnabled(true);
    useAiStore.getState().setModel("gpt-4o");
    const persisted = localStorage.getItem("openready-ai") ?? "";
    expect(persisted).not.toContain("key");
    expect(persisted).not.toContain("apiKey");
    // Only the three non-secret fields are present.
    const parsed = JSON.parse(persisted) as { state: Record<string, unknown> };
    expect(Object.keys(parsed.state).sort()).toEqual(["baseUrl", "enabled", "model"]);
  });
});
