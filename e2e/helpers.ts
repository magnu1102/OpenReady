import type { Page } from "@playwright/test";
import {
  rawOrganizationRepositories,
  rawReadme,
  rawRepositories,
  rawTree,
} from "./fixtures/github";

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
interface MockGitHubOptions {
  notModifiedOnConditional?: boolean;
}

const githubHeaders = {
  "access-control-allow-origin": "*",
  "access-control-expose-headers":
    "ETag, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Used, X-RateLimit-Reset",
  etag: '"openready-etag"',
  "x-ratelimit-limit": "60",
  "x-ratelimit-remaining": "59",
  "x-ratelimit-used": "1",
  "x-ratelimit-reset": "1800000000",
};

export async function mockGitHub(page: Page, options: MockGitHubOptions = {}): Promise<void> {
  await page.route("https://api.github.com/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (/^\/users\/[^/]+\/repos$/.test(path)) {
      if (options.notModifiedOnConditional && route.request().headers()["if-none-match"]) {
        await route.fulfill({ status: 304, body: "", headers: githubHeaders });
        return;
      }
      const repositories =
        path === "/users/github/repos" ? rawOrganizationRepositories : rawRepositories;
      await route.fulfill({ json: repositories, headers: githubHeaders });
      return;
    }
    if (/^\/repos\/[^/]+\/[^/]+\/readme$/.test(path)) {
      await route.fulfill({ json: rawReadme, headers: githubHeaders });
      return;
    }
    if (/^\/repos\/[^/]+\/[^/]+\/git\/trees\//.test(path)) {
      await route.fulfill({ json: rawTree, headers: githubHeaders });
      return;
    }
    await route.fulfill({ status: 500, body: `unmocked GitHub endpoint: ${path}` });
  });
}
