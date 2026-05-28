import { describe, expect, it } from "vitest";
import { matchesShortcut } from "./shortcuts";

function key(init: Partial<KeyboardEventInit> & { key: string }): KeyboardEvent {
  return new KeyboardEvent("keydown", init);
}

describe("matchesShortcut", () => {
  it("matches a meta + key combination", () => {
    expect(matchesShortcut(key({ key: "k", metaKey: true }), { key: "k", meta: true })).toBe(true);
    expect(matchesShortcut(key({ key: "k", ctrlKey: true }), { key: "k", meta: true })).toBe(true);
  });

  it("rejects when meta is required but missing", () => {
    expect(matchesShortcut(key({ key: "k" }), { key: "k", meta: true })).toBe(false);
  });

  it("rejects when meta is forbidden but present", () => {
    expect(matchesShortcut(key({ key: "k", metaKey: true }), { key: "k" })).toBe(false);
  });

  it("honors shift modifier", () => {
    expect(
      matchesShortcut(key({ key: "K", metaKey: true, shiftKey: true }), {
        key: "k",
        meta: true,
        shift: true,
      }),
    ).toBe(true);
    expect(
      matchesShortcut(key({ key: "k", metaKey: true }), { key: "k", meta: true, shift: true }),
    ).toBe(false);
  });
});
