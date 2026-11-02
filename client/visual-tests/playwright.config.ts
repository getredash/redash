import path from "path";
import { defineConfig, devices } from "@playwright/test";
import { STORAGE_STATE_PATH } from "./manifest";

// Rendering inside the Playwright Docker image is deterministic, so no pixel tolerance: even a changed character
// in a small widget should fail.
const screenshotOptions = { animations: "disabled", caret: "hide" } as const;

/**
 * Visual regression tests for visualizations and pages. See README.md.
 *
 * Baseline screenshots depend on the OS, fonts and browser build, so they are generated and compared inside
 * the official Playwright Docker image (`pnpm visual-tests:docker`), both locally and in CI.
 */
export default defineConfig({
  testDir: ".",
  outputDir: "./.results/test-results",
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  timeout: 3 * 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [["list"], ["html", { outputFolder: "./.results/report", open: "never" }]],
  use: {
    baseURL: process.env.VISUAL_TESTS_BASE_URL || "http://localhost:5001",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "stability",
      testMatch: /stability\.spec\.ts/,
    },
    {
      name: "seed",
      testMatch: /seed\.setup\.ts/,
    },
    {
      name: "visualizations",
      testMatch: /visualizations\.spec\.ts/,
      dependencies: ["seed"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1600, height: 1200 },
        deviceScaleFactor: 1,
      },
      expect: {
        toHaveScreenshot: { ...screenshotOptions, stylePath: path.join(__dirname, "screenshot.css") },
      },
    },
    {
      name: "seed-pages",
      testMatch: /pages\.setup\.ts/,
      dependencies: ["seed"], // uses its data source, and pages list its examples too
    },
    {
      name: "pages",
      testMatch: /pages\.spec\.ts/,
      dependencies: ["seed-pages"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
        locale: "en-US",
        timezoneId: "UTC",
        storageState: STORAGE_STATE_PATH,
        testIdAttribute: "data-test",
      },
      expect: {
        toHaveScreenshot: { ...screenshotOptions, stylePath: path.join(__dirname, "pages.css") },
      },
    },
  ],
});
