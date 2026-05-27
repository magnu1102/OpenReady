import { describe, it, expect } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins truthy class names", () => {
    const skip = false as boolean;
    expect(cn("a", "b", skip && "c", null, undefined, "d")).toBe("a b d");
  });

  it("dedupes conflicting tailwind classes via twMerge", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm text-text-primary", "text-lg")).toBe("text-text-primary text-lg");
  });

  it("handles arrays and objects", () => {
    expect(cn(["a", "b"], { c: true, d: false })).toBe("a b c");
  });
});
