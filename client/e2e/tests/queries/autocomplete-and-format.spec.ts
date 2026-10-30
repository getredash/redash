import { DATA_SOURCES } from "../../support/env";
import { expect, test } from "../../support/fixtures";
import { byTest, centerOf, getSql, pick, setSql } from "../../support/ui";
import {
  autocompleteEntries,
  autocompleteOffers,
  autocompletePopup,
  autoLimit,
  clearEditor,
  editor,
  focusEditorEnd,
  MOD,
  openNewQuery,
  run,
  settle,
  typeKeys,
} from "./helpers";

const ORDERS_COLUMNS = ["amount", "category", "channel", "city_id", "created_at", "customer", "id", "note", "quantity"];

test.describe("Autocomplete", () => {
  test("the popup offers table names and the columns of a table", async ({ page }) => {
    await openNewQuery(page, DATA_SOURCES.postgres);
    await editor(page).click();
    await typeKeys(page, "select * from ord");
    await expect(autocompletePopup(page)).toBeVisible();
    await expect(autocompleteEntries(page).filter({ hasText: /^orders\s*Table$/ })).toHaveCount(1);

    await typeKeys(page, "ers where orders.");
    await expect(autocompletePopup(page)).toBeVisible();
    await expect(async () => {
      const offers = await autocompleteOffers(page);
      expect(offers.map((offer) => offer.split(",")[0]).sort()).toEqual(
        ORDERS_COLUMNS.map((column) => `orders.${column}`).sort()
      );
      // Each column comes with its type
      expect(offers).toContain("orders.amount, Numeric");
      expect(offers).toContain("orders.created_at, Timestamp without time zone");
    }).toPass({ timeout: 10_000 });

    await typeKeys(page, "cat");
    // The match is fuzzy ("created_at" has c, a and t too); the best match comes first
    await expect(async () => {
      const offers = await autocompleteOffers(page);
      expect(offers[0]).toBe("orders.category, Character varying");
      expect(offers.length).toBeLessThan(4);
    }).toPass({ timeout: 10_000 });
  });

  test("a completion is accepted with Enter, with Tab and with a mouse click", async ({ page }) => {
    await openNewQuery(page, DATA_SOURCES.postgres);
    await editor(page).click();

    await typeKeys(page, "select * from ord");
    await expect(autocompleteEntries(page).first()).toHaveText(/^orders\s*Table$/);
    await page.keyboard.press("Enter");
    await expect.poll(() => getSql(page)).toBe("select * from orders");

    await typeKeys(page, " where orders.cat");
    await expect(autocompleteEntries(page).first()).toContainText("orders.category");
    await page.keyboard.press("Tab");
    await expect.poll(() => getSql(page)).toBe("select * from orders where orders.category");
    await typeKeys(page, " = 'Hardware'");

    await focusEditorEnd(page);
    await typeKeys(page, " and quan");
    const entry = autocompleteEntries(page).filter({ hasText: "quantity" }).first();
    await expect(entry).toBeVisible();
    const { x, y } = await centerOf(entry);
    await page.mouse.move(x, y, { steps: 8 });
    await page.mouse.click(x, y);
    await expect.poll(() => getSql(page)).toBe("select * from orders where orders.category = 'Hardware' and quantity");
    await typeKeys(page, " > 0");
    await settle(page);

    await autoLimit(page).click();
    const { sent, result, error } = await run(page);
    expect(error).toBeNull();
    expect(sent.query).toBe("select * from orders where orders.category = 'Hardware' and quantity > 0");
    expect(result?.data.rows).toHaveLength(163);
    expect(result?.data.rows.every((row) => row.category === "Hardware")).toBe(true);
  });

  test("the live-autocomplete button turns the popup off and on; Ctrl+Space still opens it", async ({ page }) => {
    await openNewQuery(page, DATA_SOURCES.postgres);
    const toggle = page.locator('.query-editor-controls button[aria-label*="live autocomplete"]');
    await expect(toggle).toHaveAttribute("aria-label", "Disable live autocomplete");
    await expect(toggle.locator("i")).toHaveClass("icon icon-flash");

    await toggle.hover();
    await expect(page.locator(".ant-tooltip:not(.ant-tooltip-hidden)")).toContainText("Live Autocomplete Enabled");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-label", "Enable live autocomplete");
    await expect(toggle.locator("i")).toHaveClass("icon icon-flash-off");
    await expect(page.locator(".ant-tooltip:not(.ant-tooltip-hidden)")).toContainText("Live Autocomplete Disabled");

    await editor(page).click();
    await typeKeys(page, "select * from ord");
    await expect.poll(() => getSql(page)).toBe("select * from ord");
    // The popup opens within a fraction of a second when it is on (see the other tests); give it that time
    await page.waitForTimeout(700);
    await expect(autocompletePopup(page)).toBeHidden();

    await page.keyboard.press("Control+Space");
    await expect(autocompletePopup(page)).toBeVisible();
    await expect(autocompleteEntries(page).filter({ hasText: /^orders\s*Table$/ })).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(autocompletePopup(page)).toBeHidden();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-label", "Disable live autocomplete");
    await clearEditor(page);
    await typeKeys(page, "select * from cit");
    await expect(autocompletePopup(page)).toBeVisible();
    await expect(autocompleteEntries(page).filter({ hasText: /^cities\s*Table$/ })).toHaveCount(1);
  });
});

test.describe("Format query", () => {
  const formatButton = (page: import("@playwright/test").Page) =>
    page.locator(".query-editor-controls button").filter({ has: page.locator(".zmdi-format-indent-increase") });

  test("the button reformats a one-line query, which still runs", async ({ page }) => {
    await openNewQuery(page, DATA_SOURCES.postgres);
    const sql =
      "select category, count(*) as n, sum(amount) as revenue from orders where channel = 'web' group by category order by n desc";
    await setSql(page, sql);
    await formatButton(page).hover();
    await expect(page.locator(".ant-tooltip:not(.ant-tooltip-hidden)")).toContainText("Format Query");
    await formatButton(page).click();

    await expect.poll(async () => (await getSql(page)).split("\n").length).toBeGreaterThan(4);
    const formatted = await getSql(page);
    // Same statement, only the whitespace (and keyword case) differs
    expect(formatted.replace(/\s+/g, " ").trim().toLowerCase()).toBe(sql);
    expect(formatted).toMatch(/^select\n/i);
    expect(formatted).toMatch(/\nfrom\n/i);
    await settle(page);

    const { result, error } = await run(page);
    expect(error).toBeNull();
    expect(result?.data.rows).toHaveLength(4);
    expect(result?.data.columns.map((column) => column.name)).toEqual(["category", "n", "revenue"]);
  });

  test("the keyboard shortcut reformats the query", async ({ page }) => {
    await openNewQuery(page, DATA_SOURCES.postgres);
    const sql = "select id, name from cities where country_code in ('US', 'DE') order by 2";
    await setSql(page, sql);
    await page.keyboard.press(`${MOD}+Shift+F`);
    await expect.poll(async () => (await getSql(page)).split("\n").length).toBeGreaterThan(4);
    expect((await getSql(page)).replace(/\s+/g, " ").trim().toLowerCase()).toBe(sql.toLowerCase());
  });

  test("formatting is not offered for a JSON data source", async ({ page }) => {
    await openNewQuery(page, DATA_SOURCES.postgres);
    await expect(formatButton(page)).toBeEnabled();
    await pick(page, byTest(page, "SelectDataSource"), DATA_SOURCES.json);
    await expect(byTest(page, "SelectDataSource")).toContainText(DATA_SOURCES.json);
    await expect(formatButton(page)).toBeDisabled();
  });
});
