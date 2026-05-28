import type { AnalysisResult, HealthLabel } from "@/types";
import { PROJECT_TYPE_LABELS } from "@/modules/project-classifier";
import { color } from "./color";

export interface TableOptions {
  username: string;
  tokenInUse: boolean;
  totalFetched: number;
  analyzedCount: number;
}

interface Column {
  header: string;
  width: number;
  align?: "left" | "right";
  cell: (analysis: AnalysisResult) => string;
}

const columns: Column[] = [
  {
    header: "Repository",
    width: 28,
    cell: (a) => a.repository.name,
  },
  {
    header: "Type",
    width: 18,
    cell: (a) => PROJECT_TYPE_LABELS[a.classification.type],
  },
  {
    header: "Health",
    width: 16,
    cell: (a) => a.healthLabel,
  },
  {
    header: "Score",
    width: 6,
    align: "right",
    cell: (a) => (a.score.total === null ? "—" : String(a.score.total)),
  },
  {
    header: "Weakest",
    width: 22,
    cell: (a) =>
      a.score.categories.find((c) => c.category === a.score.weakestCategory)?.label ?? "—",
  },
];

export function renderTable(analyses: AnalysisResult[], options: TableOptions): string {
  const lines: string[] = [];

  lines.push(color.bold(`OpenReady analysis · ${options.username}`));
  const meta = `${options.analyzedCount}/${options.totalFetched} repositories${
    options.tokenInUse ? " · token: yes" : ""
  }`;
  lines.push(color.dim(meta));
  lines.push("");

  // Header row
  lines.push(
    columns
      .map((column) => color.bold(padCell(column.header, column.width, column.align ?? "left")))
      .join("  "),
  );
  lines.push(columns.map((column) => color.dim("─".repeat(column.width))).join("  "));

  for (const analysis of analyses) {
    lines.push(
      columns
        .map((column) => {
          const value = column.cell(analysis);
          const padded = padCell(value, column.width, column.align ?? "left");
          return tintCell(column, analysis, padded);
        })
        .join("  "),
    );
    if (analysis.missingSignals[0]) {
      lines.push(`    ${color.gray("↳ " + analysis.missingSignals[0])}`);
    }
  }

  lines.push("");
  lines.push(legend());
  return lines.join("\n");
}

function tintCell(column: Column, analysis: AnalysisResult, padded: string): string {
  if (column.header === "Score") return scoreColor(analysis.score.total)(padded);
  if (column.header === "Health") return healthColor(analysis.healthLabel)(padded);
  return padded;
}

function scoreColor(score: number | null): (text: string) => string {
  if (score === null) return color.gray;
  if (score >= 85) return color.green;
  if (score >= 70) return color.cyan;
  if (score >= 50) return color.yellow;
  return color.red;
}

function healthColor(label: HealthLabel): (text: string) => string {
  switch (label) {
    case "Portfolio-ready":
      return color.green;
    case "Almost ready":
      return color.cyan;
    case "Needs work":
    case "Stale":
      return color.yellow;
    case "Experimental":
    case "Archived":
      return color.red;
    case "Fork":
    case "Analyzing":
      return color.gray;
  }
}

function legend(): string {
  return color.dim(
    "Legend: green ≥ 85 · cyan ≥ 70 · yellow ≥ 50 · red < 50. Use --format json/markdown for full evidence.",
  );
}

export function padCell(value: string, width: number, align: "left" | "right"): string {
  const truncated = value.length > width ? value.slice(0, Math.max(0, width - 1)) + "…" : value;
  if (truncated.length >= width) return truncated;
  const pad = " ".repeat(width - truncated.length);
  return align === "right" ? pad + truncated : truncated + pad;
}
