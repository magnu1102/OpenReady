import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:1420",
    // System Edge is preinstalled on GitHub runner images (and this project's
    // dev machines), so no `playwright install` download step is needed. If
    // the channel ever flakes, switch to chromium + a `playwright install
    // chromium --with-deps` CI step.
    channel: "msedge",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm dev",
    port: 1420,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
