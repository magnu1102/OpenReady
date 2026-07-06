import { beforeEach, describe, expect, it } from "vitest";
import { toast, useToastStore } from "./toastStore";

describe("toastStore", () => {
  beforeEach(() => {
    useToastStore.getState().clear();
  });

  it("pushes toasts with tone and message", () => {
    toast.success("Export saved.");
    const items = useToastStore.getState().toasts;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ tone: "success", message: "Export saved." });
  });

  it("caps the visible stack at three, dropping the oldest", () => {
    toast.info("one");
    toast.info("two");
    toast.info("three");
    toast.info("four");
    const messages = useToastStore.getState().toasts.map((t) => t.message);
    expect(messages).toEqual(["two", "three", "four"]);
  });

  it("dismisses a toast by id", () => {
    const id = toast.error("Export failed: disk full");
    expect(useToastStore.getState().toasts).toHaveLength(1);
    useToastStore.getState().dismiss(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("assigns unique ids across pushes", () => {
    const a = toast.info("a");
    const b = toast.info("b");
    expect(a).not.toBe(b);
  });
});
