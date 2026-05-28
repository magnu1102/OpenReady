import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import type { ExportFormat } from "@/modules/export-engine";

export interface SaveExportInput {
  format: ExportFormat;
  content: string;
  defaultPath: string;
}

export interface SaveExportResult {
  status: "saved" | "cancelled";
  path?: string;
}

const formatFilters: Record<ExportFormat, { name: string; extensions: string[] }> = {
  markdown: { name: "Markdown", extensions: ["md"] },
  json: { name: "JSON", extensions: ["json"] },
  "homepage-cards": { name: "Markdown", extensions: ["md"] },
};

export async function saveExportFile(input: SaveExportInput): Promise<SaveExportResult> {
  const path = await save({
    title: "Save OpenReady export",
    defaultPath: input.defaultPath,
    filters: [formatFilters[input.format]],
  });

  if (!path) {
    return { status: "cancelled" };
  }

  await writeTextFile(path, input.content);
  return { status: "saved", path };
}
