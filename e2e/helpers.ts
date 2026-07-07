import type { Page } from "@playwright/test";
import { rawReadme, rawRepositories, rawTree } from "./fixtures/github";

/**
 * Marks the guided tour as seen BEFORE any page script runs. Without this the
 * tour's focus-trapped dialog auto-opens once the dashboard has repositories
 * and blocks every interaction. Shape mirrors the zustand persist envelope of
 * src/modules/tour/tourStore.ts (key "openready-tour").
 */
export async function seedTourSeen(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem(
      "openready-tour",
      JSON.stringify({ state: { seen: true, activeStep: null }, version: 0 }),
    );
  });
}

/**
 * Routes every api.github.com call to fixtures. Unmatched GitHub paths return
 * 500 so an unexpected request fails the test loudly instead of leaving the
 * runner to hit the real network.
 */
export async function mockGitHub(page: Page): Promise<void> {
  await page.route("https://api.github.com/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (/^\/users\/[^/]+\/repos$/.test(path)) {
      await route.fulfill({ json: rawRepositories });
      return;
    }
    if (/^\/repos\/[^/]+\/[^/]+\/readme$/.test(path)) {
      await route.fulfill({ json: rawReadme });
      return;
    }
    if (/^\/repos\/[^/]+\/[^/]+\/git\/trees\//.test(path)) {
      await route.fulfill({ json: rawTree });
      return;
    }
    await route.fulfill({ status: 500, body: `unmocked GitHub endpoint: ${path}` });
  });
}
