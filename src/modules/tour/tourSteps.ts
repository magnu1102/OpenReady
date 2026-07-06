import type { TourStep } from "./types";
import { copy } from "@/lib/copy";

// Structure (routes, anchors, placement) lives here; the step text lives in
// the central copy module alongside every other user-facing string.
export const tourSteps: TourStep[] = [
  {
    id: "welcome-cta",
    route: "/",
    anchorId: "welcome-cta",
    title: copy.tour.steps[0].title,
    body: copy.tour.steps[0].body,
    placement: "bottom",
  },
  {
    id: "dashboard-first-card",
    route: "/dashboard",
    anchorId: "dashboard-first-card",
    title: copy.tour.steps[1].title,
    body: copy.tour.steps[1].body,
    placement: "bottom",
  },
  {
    id: "export-panel",
    route: "/dashboard",
    anchorId: "export-panel",
    title: copy.tour.steps[2].title,
    body: copy.tour.steps[2].body,
    placement: "top",
  },
  {
    id: "settings-replay",
    route: "/settings",
    anchorId: "settings-replay",
    title: copy.tour.steps[3].title,
    body: copy.tour.steps[3].body,
    placement: "bottom",
  },
];
