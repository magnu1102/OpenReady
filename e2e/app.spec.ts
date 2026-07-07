import { expect, test } from "@playwright/test";
import { copy } from "../src/lib/copy";
import { mockGitHub, seedTourSeen } from "./helpers";

test.beforeEach(async ({ page }) => {
  await seedTourSeen(page);
  await mockGitHub(page);
});

test("boots to the Welcome screen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: copy.welcome.heading })).toBeVisible();
  await expect(page.getByLabel(copy.welcome.form.label)).toBeVisible();
});

test("analyzes a mocked profile and renders the dashboard", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(copy.welcome.form.label).fill("octocat");
  await page.getByRole("button", { name: copy.welcome.form.submit }).click();

  // Dashboard renders the analyzed repository card.
  await expect(page.getByRole("heading", { name: copy.dashboard.title })).toBeVisible();
  const card = page.locator("a[data-repo-card-link='true']");
  await expect(card).toHaveText("openready");
  await expect(page.getByText("octocat/openready")).toBeVisible();
  await expect(page.getByText("TypeScript").first()).toBeVisible();

  // The seeded tour flag must hold — a visible tour dialog here means the
  // persisted-store shape drifted (see e2e/helpers.ts).
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // A score eventually resolves from the mocked README + tree.
  await expect(page.getByText(/Score \d+/).first()).toBeVisible({ timeout: 15_000 });
});
