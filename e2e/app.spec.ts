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
  await expect(page.getByText(/GitHub budget: 59\/60 left/)).toBeVisible();
});

test("analyzes a mocked organization account", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(copy.welcome.form.label).fill("github");
  await page.getByRole("button", { name: copy.welcome.form.submit }).click();

  await expect(page.getByRole("heading", { name: copy.dashboard.title })).toBeVisible();
  await expect(page.getByText("github/openready-org")).toBeVisible();
});

test("reuses cached repositories after a conditional refresh", async ({ page }) => {
  await page.unroute("https://api.github.com/**");
  await mockGitHub(page, { notModifiedOnConditional: true });

  await page.goto("/");
  await page.getByLabel(copy.welcome.form.label).fill("octocat");
  await page.getByRole("button", { name: copy.welcome.form.submit }).click();
  await expect(page.getByText(/Score \d+/).first()).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: copy.dashboard.refresh }).click();

  await expect(page.getByText(copy.dashboard.refreshSummary(1, 0))).toBeVisible();
});
