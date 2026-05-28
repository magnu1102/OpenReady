import type { TourStep } from "./types";

export const tourSteps: TourStep[] = [
  {
    id: "welcome-cta",
    route: "/",
    anchorId: "welcome-cta",
    title: "Start with a GitHub username",
    body: "OpenReady runs deterministic checks on public repositories. Enter any GitHub username on this screen to begin — results are cached locally.",
    placement: "bottom",
  },
  {
    id: "dashboard-first-card",
    route: "/dashboard",
    anchorId: "dashboard-first-card",
    title: "Browse your repository portfolio",
    body: "Each card shows a health label, a project-type classification, and a score. Click in to drill down into the evidence.",
    placement: "bottom",
  },
  {
    id: "export-panel",
    route: "/dashboard",
    anchorId: "export-panel",
    title: "Export your analysis",
    body: "Save the in-memory analysis as Markdown, JSON, or homepage cards. These exports stay local — nothing leaves your machine.",
    placement: "top",
  },
  {
    id: "settings-replay",
    route: "/settings",
    anchorId: "settings-replay",
    title: "Replay this tour anytime",
    body: "Found this useful? Replay the tour from Settings whenever you want, manage your cache, and add an optional GitHub token for higher rate limits.",
    placement: "bottom",
  },
];
