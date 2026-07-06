import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { copy } from "@/lib/copy";
import { TourOverlay } from "./TourOverlay";
import { useTourStore } from "./tourStore";

function AnchorScreen() {
  return (
    <TooltipProvider>
      <button data-tour-anchor="welcome-cta">Analyze</button>
      <TourOverlay />
    </TooltipProvider>
  );
}

const ANCHOR_RECT = { top: 120, left: 340, width: 96, height: 36 };

describe("TourOverlay", () => {
  beforeEach(() => {
    useTourStore.setState({ seen: false, activeStep: 0 });
  });

  it("renders the first step's copy in a dialog", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AnchorScreen />
      </MemoryRouter>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: copy.tour.steps[0].title })).toBeInTheDocument();
    expect(screen.getByText(copy.tour.controls.progress(1, 4))).toBeInTheDocument();
  });

  it("positions the highlight ring from the anchor's measured rect", async () => {
    // jsdom returns all-zero rects; stub the anchor's rect so the overlay has
    // real geometry to measure — this is the regression net for entrance
    // animations shifting anchors while the tour is open.
    const original = Element.prototype.getBoundingClientRect;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ) {
      if (this.getAttribute?.("data-tour-anchor") === "welcome-cta") {
        return { ...ANCHOR_RECT, right: 436, bottom: 156, x: 340, y: 120, toJSON: () => ({}) };
      }
      return original.call(this);
    });

    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <AnchorScreen />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const ring = container.ownerDocument.querySelector(".ring-accent");
      expect(ring).not.toBeNull();
      const style = (ring as HTMLElement).style;
      // 4px highlight padding around the measured anchor rect.
      expect(style.top).toBe(`${ANCHOR_RECT.top - 4}px`);
      expect(style.left).toBe(`${ANCHOR_RECT.left - 4}px`);
      expect(style.width).toBe(`${ANCHOR_RECT.width + 8}px`);
      expect(style.height).toBe(`${ANCHOR_RECT.height + 8}px`);
    });

    vi.restoreAllMocks();
  });
});
