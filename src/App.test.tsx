import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders the Welcome route at the initial entry", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /understand and improve/i }),
    ).toBeInTheDocument();
  });

  it("renders the sidebar with primary navigation", () => {
    render(<App />);
    const nav = screen.getByRole("navigation", { name: /primary/i });
    expect(nav).toBeInTheDocument();
  });
});
