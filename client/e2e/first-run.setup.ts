import fs from "fs";
import path from "path";
import { expect, test } from "@playwright/test";
import { ADMIN, FRESH_INSTANCE_MARKER } from "./support/env";

/**
 * The first-run setup page. It only exists until the first admin is created, so these tests run when the
 * instance is fresh (as in CI) and are skipped otherwise.
 */
test.describe.configure({ mode: "serial" });

let fresh = false;

test.beforeAll(async ({ request }) => {
  const setupPage = await request.get("/setup", { maxRedirects: 0 });
  fresh = setupPage.status() === 200;
  fs.mkdirSync(path.dirname(FRESH_INSTANCE_MARKER), { recursive: true });
  fs.rmSync(FRESH_INSTANCE_MARKER, { force: true });
});

test("a fresh instance redirects to the setup page", async ({ page }) => {
  test.skip(!fresh, "the instance is already set up");
  await page.goto("/");
  await expect(page).toHaveURL(/\/setup$/);
  await expect(page.getByText("Welcome to Redash!")).toBeVisible();
});

test("the setup form rejects an invalid email address", async ({ page }) => {
  test.skip(!fresh, "the instance is already set up");
  await page.goto("/setup");
  await page.fill('input[name="name"]', ADMIN.name);
  await page.fill('input[name="email"]', "not-an-email@@x");
  await page.fill('input[name="password"]', ADMIN.password);
  await page.fill('input[name="org_name"]', "Redash");
  // Skip the browser's own validation so the server's validator answers
  await page.locator("form").evaluate((form) => form.setAttribute("novalidate", ""));
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/setup$/);
  await expect(page.getByText("Invalid email address.")).toBeVisible();
});

test("the setup form creates the admin and opens the home page", async ({ page }) => {
  test.skip(!fresh, "the instance is already set up");
  await page.goto("/setup");
  await page.fill('input[name="name"]', ADMIN.name);
  await page.fill('input[name="email"]', ADMIN.email);
  await page.fill('input[name="password"]', ADMIN.password);
  await page.fill('input[name="org_name"]', "Redash");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Welcome to Redash")).toBeVisible();
  await expect(page.getByText("Connect a Data Source")).toBeVisible();
  fs.writeFileSync(FRESH_INSTANCE_MARKER, new Date().toISOString());

  // The setup page is gone afterwards
  await page.goto("/setup");
  await expect(page).not.toHaveURL(/\/setup$/);
});
