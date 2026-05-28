import type { TourStep } from "./types";

export const tourSteps: TourStep[] = [
  {
    id: "welcome-cta",
    route: "/",
    anchorId: "welcome-cta",
    title: "Start with a GitHub username",
    body: "OpenReady runs deterministic checks on public repositories. Enter any GitHub username here to begin — we'll cache results locally.",
    placement: "bottom",
  },
  {
    id: "dashboard-first-card",
    route: "/dashboard",
    anchorId: "dashboard-first-card",
    title: "Browse your repository portfolio",
    body: "Each card carries a health label, a project-type classification, and a score. Click in to drill down into evidence.",
    placement: "bottom",
  },
  {
    id: "detail-score",
    route: "/dashboard",
    anchorId: "export-panel",
    title: "Export your analysis",
    body: "Save the in-memory analysis as Markdown, JSON or homepage cards. These exports are fully local — nothing leaves your machine.",
    placement: "top",
  },
  {
    id: "settings-replay",
    route: "/settings",
    anchorId: "settings-replay",
    title: "Replay this tour anytime",
    body: "Found this useful? You can replay the tour from Settings, manage your cache, and add an optional GitHub token for higher rate limits.",
    placement: "bottom",
  },
];
