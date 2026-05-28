import { beforeEach, describe, expect, it, vi } from "vitest";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { saveExportFile } from "./exportFiles";

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  writeTextFile: vi.fn(),
}));

const saveMock = vi.mocked(save);
const writeTextFileMock = vi.mocked(writeTextFile);

beforeEach(() => {
  saveMock.mockReset();
  writeTextFileMock.mockReset();
});

describe("saveExportFile", () => {
  it("writes the selected export file", async () => {
    saveMock.mockResolvedValueOnce("C:/Users/octocat/report.md");

    const result = await saveExportFile({
      format: "markdown",
      content: "# Report",
      defaultPath: "octocat-openready-report.md",
    });

    expect(saveMock).toHaveBeenCalledWith({
      title: "Save OpenReady export",
      defaultPath: "octocat-openready-report.md",
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    expect(writeTextFileMock).toHaveBeenCalledWith("C:/Users/octocat/report.md", "# Report");
    expect(result).toEqual({ status: "saved", path: "C:/Users/octocat/report.md" });
  });

  it("does not write when the save dialog is cancelled", async () => {
    saveMock.mockResolvedValueOnce(null);

    const result = await saveExportFile({
      format: "json",
      content: "{}",
      defaultPath: "octocat-openready-summary.json",
    });

    expect(writeTextFileMock).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "cancelled" });
  });

  it("surfaces write failures", async () => {
    saveMock.mockResolvedValueOnce("C:/Users/octocat/report.md");
    writeTextFileMock.mockRejectedValueOnce(new Error("disk full"));

    await expect(
      saveExportFile({
        format: "homepage-cards",
        content: "# Cards",
        defaultPath: "octocat-homepage-cards.md",
      }),
    ).rejects.toThrow("disk full");
  });
});
