import { afterEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiSuggestionPanel } from "./AiSuggestionPanel";
import { useAiStore } from "@/store/aiStore";
import type { AiSuggestion } from "@/modules/ai-adapter";

const suggestion: AiSuggestion = {
  text: "A tighter, friendlier rewrite.",
  model: "gpt-4o-mini",
  promptCharCount: 128,
};

afterEach(() => {
  useAiStore.setState({ enabled: false });
});

describe("AiSuggestionPanel", () => {
  it("disables Generate and explains why when AI is off", () => {
    useAiStore.setState({ enabled: false });
    render(
      <AiSuggestionPanel
        title="README critique"
        description="Sends the README to your provider."
        generate={() => Promise.resolve(suggestion)}
      />,
    );

    const button = screen.getByRole("button", { name: /generate/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", expect.stringMatching(/enable ai features/i));
    expect(screen.getByText(/turn on ai features in settings/i)).toBeInTheDocument();
  });

  it("renders the returned text and a Copy button after generating", async () => {
    useAiStore.setState({ enabled: true });
    const user = userEvent.setup();
    render(
      <AiSuggestionPanel
        title="README critique"
        description="Sends the README to your provider."
        generate={() => Promise.resolve(suggestion)}
      />,
    );

    await user.click(screen.getByRole("button", { name: /generate/i }));

    await waitFor(() => {
      expect(screen.getByText(suggestion.text)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    expect(screen.getByText(/128 characters sent/i)).toBeInTheDocument();
  });

  it("surfaces a friendly error when generation fails", async () => {
    useAiStore.setState({ enabled: true });
    const user = userEvent.setup();
    render(
      <AiSuggestionPanel
        title="README critique"
        description="Sends the README to your provider."
        generate={() => Promise.reject(new Error("Provider rejected the API key."))}
      />,
    );

    await user.click(screen.getByRole("button", { name: /generate/i }));

    await waitFor(() => {
      expect(screen.getByText(/provider rejected the api key/i)).toBeInTheDocument();
    });
  });
});
