import { describe, it, expect, beforeEach } from "vitest";
import { applyTheme, useThemeStore } from "./themeStore";

describe("themeStore", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    useThemeStore.setState({ mode: "light" });
  });

  it("applyTheme adds the dark class for dark mode", () => {
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("applyTheme removes the dark class for light mode", () => {
    document.documentElement.classList.add("dark");
    applyTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("setMode updates state and toggles the dark class", () => {
    useThemeStore.getState().setMode("dark");
    expect(useThemeStore.getState().mode).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
