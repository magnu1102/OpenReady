import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useTourStore, TOUR_STEP_COUNT } from "./tourStore";
import { tourSteps } from "./tourSteps";
import type { TourPlacement } from "./types";
import { Button } from "@/components/ui/Button";
import { useFocusTrap } from "@/lib/useFocusTrap";

const POPOVER_WIDTH = 320;
const GAP = 12;

interface Rect {
  anchorId: string;
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TourOverlay() {
  const activeStep = useTourStore((s) => s.activeStep);
  const next = useTourStore((s) => s.next);
  const prev = useTourStore((s) => s.prev);
  const skip = useTourStore((s) => s.skip);
  const navigate = useNavigate();
  const location = useLocation();
  const popoverRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(popoverRef, activeStep !== null);

  const step = activeStep === null ? null : (tourSteps[activeStep] ?? null);

  // Navigate to the step's route if needed.
  useEffect(() => {
    if (!step) return;
    if (step.route && location.pathname !== step.route) {
      navigate(step.route);
    }
  }, [step, location.pathname, navigate]);

  const [measuredRect, setMeasuredRect] = useState<Rect | null>(null);
  // Only honor a measurement that still matches the current step + route.
  const anchorRect: Rect | null =
    step &&
    (!step.route || step.route === location.pathname) &&
    measuredRect?.anchorId === step.anchorId
      ? measuredRect
      : null;

  useLayoutEffect(() => {
    if (!step) return;
    if (step.route && location.pathname !== step.route) return;

    const anchorId = step.anchorId;
    function measure() {
      const target = document.querySelector<HTMLElement>(`[data-tour-anchor="${anchorId}"]`);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      setMeasuredRect({
        anchorId,
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }

    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(document.body);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    const retry = window.setTimeout(measure, 80);

    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
      window.clearTimeout(retry);
    };
  }, [step, location.pathname]);

  // Trap Escape to skip.
  useEffect(() => {
    if (!step) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        skip();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, skip]);

  // Focus the popover when it appears for keyboard users.
  useEffect(() => {
    if (!step) return;
    popoverRef.current?.focus();
  }, [step]);

  if (!step || activeStep === null) return null;

  const popoverPosition = computePopoverPosition(anchorRect, step.placement);
  const isFirst = activeStep === 0;
  const isLast = activeStep === TOUR_STEP_COUNT - 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[80]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      {/* Dimmer with anchor cutout via clip-path */}
      <div className="absolute inset-0 bg-black/55" style={cutoutStyle(anchorRect)} />

      {/* Anchor highlight ring */}
      {anchorRect ? (
        <div
          className="pointer-events-none absolute rounded-lg ring-2 ring-accent ring-offset-2 ring-offset-canvas"
          style={{
            top: anchorRect.top - 4,
            left: anchorRect.left - 4,
            width: anchorRect.width + 8,
            height: anchorRect.height + 8,
          }}
        />
      ) : null}

      {/* Popover */}
      <div
        ref={popoverRef}
        tabIndex={-1}
        className="absolute flex flex-col gap-3 rounded-lg border border-border-default bg-surface p-4 shadow-xl focus-visible:outline-none"
        style={{
          width: POPOVER_WIDTH,
          top: popoverPosition.top,
          left: popoverPosition.left,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Step {activeStep + 1} of {TOUR_STEP_COUNT}
          </span>
          <button
            type="button"
            onClick={skip}
            className="text-xs text-text-muted hover:text-text-primary"
          >
            Skip tour
          </button>
        </div>
        <h2 id="tour-title" className="text-md font-semibold text-text-primary">
          {step.title}
        </h2>
        <p className="text-sm text-text-secondary">{step.body}</p>
        <div className="mt-1 flex items-center justify-end gap-2">
          {!isFirst ? (
            <Button type="button" variant="ghost" size="sm" onClick={prev}>
              Back
            </Button>
          ) : null}
          <Button type="button" variant="primary" size="sm" onClick={next}>
            {isLast ? "Done" : "Next"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function computePopoverPosition(
  anchor: Rect | null,
  placement: TourPlacement,
): { top: number; left: number } {
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;

  if (!anchor) {
    return {
      top: Math.max(24, viewportHeight / 2 - 80),
      left: Math.max(24, viewportWidth / 2 - POPOVER_WIDTH / 2),
    };
  }

  let top = 0;
  let left = 0;
  switch (placement) {
    case "bottom":
      top = anchor.top + anchor.height + GAP;
      left = anchor.left + anchor.width / 2 - POPOVER_WIDTH / 2;
      break;
    case "top":
      top = anchor.top - GAP - 180;
      left = anchor.left + anchor.width / 2 - POPOVER_WIDTH / 2;
      break;
    case "left":
      top = anchor.top + anchor.height / 2 - 80;
      left = anchor.left - POPOVER_WIDTH - GAP;
      break;
    case "right":
      top = anchor.top + anchor.height / 2 - 80;
      left = anchor.left + anchor.width + GAP;
      break;
  }

  // Clamp inside viewport.
  left = Math.max(16, Math.min(viewportWidth - POPOVER_WIDTH - 16, left));
  top = Math.max(16, Math.min(viewportHeight - 200, top));
  return { top, left };
}

function cutoutStyle(anchor: Rect | null): React.CSSProperties {
  if (!anchor) return {};
  const pad = 6;
  const x1 = anchor.left - pad;
  const y1 = anchor.top - pad;
  const x2 = anchor.left + anchor.width + pad;
  const y2 = anchor.top + anchor.height + pad;
  // Even-odd clip path: outer rect minus the anchor rect.
  const path = `polygon(
    0 0,
    100% 0,
    100% 100%,
    0 100%,
    0 ${y1}px,
    ${x1}px ${y1}px,
    ${x1}px ${y2}px,
    ${x2}px ${y2}px,
    ${x2}px ${y1}px,
    0 ${y1}px
  )`;
  return { clipPath: path };
}
