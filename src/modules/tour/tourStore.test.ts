import { beforeEach, describe, expect, it } from "vitest";
import { useTourStore, TOUR_STEP_COUNT } from "./tourStore";

describe("tourStore", () => {
  beforeEach(() => {
    useTourStore.setState({ seen: false, activeStep: null });
  });

  it("starts at step 0 from idle and is a no-op when already active", () => {
    useTourStore.getState().start();
    expect(useTourStore.getState().activeStep).toBe(0);
    useTourStore.setState({ activeStep: 2 });
    useTourStore.getState().start();
    expect(useTourStore.getState().activeStep).toBe(2);
  });

  it("advances through steps and ends by marking seen", () => {
    useTourStore.getState().start();
    for (let i = 1; i < TOUR_STEP_COUNT; i++) {
      useTourStore.getState().next();
      expect(useTourStore.getState().activeStep).toBe(i);
    }
    useTourStore.getState().next();
    expect(useTourStore.getState().activeStep).toBeNull();
    expect(useTourStore.getState().seen).toBe(true);
  });

  it("prev steps back but never below 0", () => {
    useTourStore.getState().start();
    useTourStore.getState().next();
    useTourStore.getState().prev();
    expect(useTourStore.getState().activeStep).toBe(0);
    useTourStore.getState().prev();
    expect(useTourStore.getState().activeStep).toBe(0);
  });

  it("skip ends the tour and marks seen", () => {
    useTourStore.getState().start();
    useTourStore.getState().skip();
    expect(useTourStore.getState().activeStep).toBeNull();
    expect(useTourStore.getState().seen).toBe(true);
  });

  it("restart resets seen and activates step 0", () => {
    useTourStore.setState({ seen: true, activeStep: null });
    useTourStore.getState().restart();
    expect(useTourStore.getState().activeStep).toBe(0);
    expect(useTourStore.getState().seen).toBe(false);
  });

  it("setStep clamps to valid range", () => {
    useTourStore.getState().setStep(-1);
    expect(useTourStore.getState().activeStep).toBeNull();
    useTourStore.getState().setStep(TOUR_STEP_COUNT);
    expect(useTourStore.getState().activeStep).toBeNull();
    useTourStore.getState().setStep(2);
    expect(useTourStore.getState().activeStep).toBe(2);
  });
});
