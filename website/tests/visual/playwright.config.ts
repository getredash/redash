import { defineConfig, devices } from '@playwright/test'

// Visual parity check between the old Gatsby site (REFERENCE_URL, the live
// redash.io until cutover) and this build (served by `astro preview`).
// See tests/visual/README.md.
const PORT = 4329

export default defineConfig({
  testDir: '.',
  outputDir: '../../test-results/visual',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  timeout: 120_000,
  reporter: [['list'], ['html', { outputFolder: '../../playwright-report', open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 800, height: 1024 } } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 740 } } },
  ],
  webServer: {
    command: `pnpm exec astro preview --port ${PORT} --ignore-lock`,
    cwd: '../..',
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
  },
})
