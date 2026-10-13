import { defineConfig, devices } from "@playwright/test";
import { ADMIN_STATE, BASE_URL } from "./support/env";

/**
 * End-to-end tests: the product driven through the UI in a real browser. See README.md.
 *
 * Projects run in this order:
 *   first-run  the setup page - only does something on an instance that has no admin yet
 *   setup      logs in, creates the shared data sources and the limited user through the API
 *   e2e        the tests
 */
export default defineConfig({
  testDir: ".",
  // Override when several runs share a checkout: each run empties its output directory when it starts
  outputDir: process.env.E2E_OUTPUT_DIR || "./.results/test-results",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  // Tests in one file run in order (many build on each other); files run in parallel
  fullyParallel: false,
  workers: process.env.E2E_WORKERS ? Number(process.env.E2E_WORKERS) : 3,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: [["list"], ["html", { outputFolder: "./.results/report", open: "never" }]],
  use: {
    baseURL: BASE_URL,
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    timezoneId: "Asia/Jerusalem", // not UTC, so tests notice times shown in the wrong zone
    actionTimeout: 15_000,
    trace: "retain-on-failure",
    // E2E_VIDEO=on records every test, e.g. to review a run by eye
    video: (process.env.E2E_VIDEO as "on" | "off" | undefined) || "retain-on-failure",
  },
  projects: [
    { name: "first-run", testMatch: /first-run\.setup\.ts/ },
    { name: "setup", testMatch: /global\.setup\.ts/, dependencies: ["first-run"] },
    {
      name: "e2e",
      testMatch: /tests\/.*\.spec\.ts/,
      dependencies: ["setup"],
      use: { storageState: ADMIN_STATE },
    },
  ],
});
