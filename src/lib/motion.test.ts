import { describe, expect, it } from "vitest";
import { durations, easeSoft, fadeIn, fadeUp, routeVariants, staggerContainer } from "./motion";

describe("motion constants", () => {
  it("mirrors the CSS duration tokens (micro/soft/route)", () => {
    expect(durations.micro).toBe(0.15);
    expect(durations.soft).toBe(0.22);
    expect(durations.route).toBe(0.32);
  });

  it("uses the shared soft easing curve", () => {
    expect(easeSoft).toEqual([0.2, 0.8, 0.2, 1]);
  });

  it("keeps fadeIn opacity-only so tour anchors measure correctly", () => {
    expect(Object.keys(fadeIn.hidden as object)).toEqual(["opacity"]);
    const visible = fadeIn.visible as Record<string, unknown>;
    expect(Object.keys(visible)).not.toContain("y");
    expect(Object.keys(visible)).not.toContain("x");
    expect(Object.keys(visible)).not.toContain("scale");
  });

  it("defines entrance states for fadeUp and routeVariants", () => {
    for (const variants of [fadeUp, routeVariants]) {
      expect(variants.hidden).toBeDefined();
      expect(variants.visible).toBeDefined();
    }
  });

  it("staggerContainer produces per-child delays under the 600ms budget for typical grids", () => {
    const variants = staggerContainer(0.04);
    const visible = variants.visible as { transition: { staggerChildren: number } };
    expect(visible.transition.staggerChildren).toBe(0.04);
    // 9 visible cards is the typical first dashboard viewport.
    expect(9 * visible.transition.staggerChildren + durations.soft).toBeLessThan(0.6);
  });
});
