import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { copy } from "@/lib/copy";
import { WelcomeRoute } from "./WelcomeRoute";

function renderWelcome() {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <WelcomeRoute />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe("WelcomeRoute", () => {
  it("renders the hero copy", () => {
    renderWelcome();
    expect(screen.getByRole("heading", { name: copy.welcome.heading })).toBeInTheDocument();
  });

  it("renders the GitHub account input", () => {
    renderWelcome();
    expect(screen.getByLabelText(/github user or organization/i)).toBeInTheDocument();
  });

  it("enables repository fetch from the account form", () => {
    renderWelcome();
    expect(screen.getByRole("button", { name: /analyze/i })).toBeEnabled();
  });

  it("shows validation copy for repository paths", async () => {
    const user = userEvent.setup();
    renderWelcome();

    await user.type(screen.getByLabelText(/github user or organization/i), "octocat/hello-world");
    await user.click(screen.getByRole("button", { name: /analyze/i }));

    expect(screen.getByText(/not a url or repository path/i)).toBeInTheDocument();
  });
});
