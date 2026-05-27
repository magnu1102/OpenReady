import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/Tooltip";
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
    expect(
      screen.getByRole("heading", { name: /understand and improve/i }),
    ).toBeInTheDocument();
  });

  it("renders the GitHub username input", () => {
    renderWelcome();
    expect(screen.getByLabelText(/github username/i)).toBeInTheDocument();
  });

  it("disables the Analyze button in Phase 1", () => {
    renderWelcome();
    expect(screen.getByRole("button", { name: /analyze/i })).toBeDisabled();
  });
});
