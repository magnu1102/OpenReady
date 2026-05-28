export type ProjectType =
  | "frontend"
  | "backend"
  | "full-stack"
  | "desktop"
  | "cli"
  | "library"
  | "unknown";

export type Confidence = "high" | "medium" | "low";

export interface ClassificationResult {
  type: ProjectType;
  detectedType: ProjectType;
  confidence: Confidence;
  reasons: string[];
  runnerUp: ProjectType | null;
  overridden: boolean;
}

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  frontend: "Frontend app",
  backend: "Backend / API",
  "full-stack": "Full-stack app",
  desktop: "Desktop app",
  cli: "CLI tool",
  library: "Library / package",
  unknown: "Unclassified",
};

export const SELECTABLE_PROJECT_TYPES: ProjectType[] = [
  "frontend",
  "backend",
  "full-stack",
  "desktop",
  "cli",
  "library",
];
