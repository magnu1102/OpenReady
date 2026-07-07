import { describe, expect, it } from "vitest";
import { copy } from "./copy";

function collectStrings(node: unknown, path: string): Array<{ path: string; value: string }> {
  if (typeof node === "string") return [{ path, value: node }];
  if (typeof node === "function") {
    const rendered: unknown = (node as (arg: string) => unknown)("sample");
    return typeof rendered === "string" ? [{ path, value: rendered }] : [];
  }
  if (node && typeof node === "object") {
    return Object.entries(node).flatMap(([key, value]) => collectStrings(value, `${path}.${key}`));
  }
  return [];
}

describe("copy", () => {
  const strings = collectStrings(copy, "copy");

  it("contains no empty or whitespace-only strings", () => {
    for (const { path, value } of strings) {
      expect(value.trim(), path).not.toBe("");
    }
  });

  it("contains no exclamation marks (voice: confident and precise)", () => {
    for (const { path, value } of strings) {
      expect(value, path).not.toContain("!");
    }
  });

  it("uses repository and cached analysis vocabulary in app copy", () => {
    for (const { path, value } of strings) {
      expect(value, path).not.toMatch(/\brepo\b/i);
      expect(value, path).not.toMatch(/\bsnapshots?\b/i);
    }
  });

  it("renders the version badge from a raw version string", () => {
    expect(copy.app.versionBadge("0.4.0-dev")).toBe("v0.4.0-dev");
  });
});
