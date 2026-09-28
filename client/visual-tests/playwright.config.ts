import path from "path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Visual regression tests for visualizations. See README.md.
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
  expect: {
    // Rendering inside the Playwright Docker image is deterministic, so no pixel tolerance: even a changed
    // character in a small widget should fail.
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      stylePath: path.join(__dirname, "screenshot.css"),
    },
  },
  projects: [
    {
      name: "seed",
      testMatch: /seed\.setup\.ts/,
    },
    {
      name: "visualizations",
      testMatch: /\.spec\.ts/,
      dependencies: ["seed"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1600, height: 1200 },
        deviceScaleFactor: 1,
      },
    },
  ],
});
