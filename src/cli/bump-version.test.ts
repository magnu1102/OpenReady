import { describe, expect, it } from "vitest";
import { promoteUnreleased } from "../../scripts/bump-version.mjs";

describe("promoteUnreleased", () => {
  it("promotes the changelog heading and refreshes release anchors", () => {
    const changelog = [
      "# Changelog",
      "",
      "## [Unreleased]",
      "",
      "- Pending change.",
      "",
      "[Unreleased]: https://github.com/magnu1102/OpenReady/compare/v0.5.0...HEAD",
      "[0.5.0]: https://github.com/magnu1102/OpenReady/releases/tag/v0.5.0",
      "",
    ].join("\n");

    expect(promoteUnreleased(changelog, "0.6.0", "2026-07-07")).toBe(
      [
        "# Changelog",
        "",
        "## [Unreleased]",
        "",
        "_No changes yet._",
        "",
        "## [0.6.0] — 2026-07-07",
        "",
        "- Pending change.",
        "",
        "[Unreleased]: https://github.com/magnu1102/OpenReady/compare/v0.6.0...HEAD",
        "[0.6.0]: https://github.com/magnu1102/OpenReady/releases/tag/v0.6.0",
        "[0.5.0]: https://github.com/magnu1102/OpenReady/releases/tag/v0.5.0",
        "",
      ].join("\n"),
    );
  });

  it("handles malformed trailing anchor-like text without regex backtracking", () => {
    const malformedTail = ["[Unreleased]:", ...Array.from({ length: 5000 }, () => "[\\]:")].join(
      "\n",
    );
    const changelog = [
      "# Changelog",
      "",
      "## [Unreleased]",
      "",
      "- Pending change.",
      "",
      malformedTail,
    ].join("\n");

    const promoted = promoteUnreleased(changelog, "0.6.0", "2026-07-07");

    expect(promoted).toContain("## [0.6.0] — 2026-07-07");
    expect(promoted.endsWith(malformedTail)).toBe(true);
  });
});
