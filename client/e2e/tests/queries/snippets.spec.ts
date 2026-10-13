import type { Page } from "@playwright/test";
import { DATA_SOURCES } from "../../support/env";
import { expect, test, uniqueName } from "../../support/fixtures";
import { byTest, dismissToasts, getSql, retype, toast } from "../../support/ui";
import {
  autocompleteOffers,
  autocompletePopup,
  clearEditor,
  editor,
  MOD,
  openNewQuery,
  resultRows,
  run,
  settle,
  typeKeys,
} from "./helpers";

interface Snippet {
  id: number;
  trigger: string;
  description: string;
  snippet: string;
}

const dialog = (page: Page) => byTest(page, "QuerySnippetDialog");
const fields = (page: Page) => dialog(page).locator("input.ant-input");
const row = (page: Page, trigger: string) => page.locator("tbody tr").filter({ hasText: trigger });

test.describe("Query snippets", () => {
  test.describe.configure({ mode: "serial" });

  const trigger = `Qsnip${uniqueName("x").slice(2)}`;
  const findSnippet = async (api: { get: (path: string) => Promise<Snippet[]> }) =>
    (await api.get("/api/query_snippets")).find((snippet) => snippet.trigger === trigger);

  test.afterAll(async ({ api }) => {
    const left = await findSnippet(api);
    if (left) {
      await api.delete(`/api/query_snippets/${left.id}`);
    }
  });

  test("a snippet is created from Settings > Query Snippets", async ({ page, api }) => {
    await page.goto("/");
    await byTest(page, "SettingsLink").click();
    await page.getByRole("link", { name: "Query Snippets" }).click();
    await expect(page).toHaveURL(/\/query_snippets$/);

    await page.getByRole("button", { name: /New Query Snippet/ }).click();
    await expect(dialog(page)).toContainText("Create Query Snippet");
    // The Trigger field has the focus when the dialog opens
    await expect(fields(page).nth(0)).toBeFocused();
    await page.keyboard.type(trigger);
    await fields(page).nth(1).click();
    await page.keyboard.type("Q orders by category");
    await dialog(page).locator(".ace_content").click();
    // biome-ignore lint/suspicious/noTemplateCurlyInString: the snippet placeholder syntax
    const body = "select category, count(*) as n from orders where channel = '${1:web}' group by 1";
    await page.keyboard.type(body);
    await byTest(page, "SaveQuerySnippetButton").click();

    await expect(dialog(page)).toHaveCount(0);
    await expect(row(page, trigger)).toContainText("Q orders by category");
    await expect(row(page, trigger).locator(".snippet-content")).toHaveText(body);
    expect(await findSnippet(api)).toMatchObject({ trigger, description: "Q orders by category", snippet: body });
  });

  test("typing the trigger in the editor offers the snippet; Enter inserts it with the placeholder selected", async ({
    page,
  }) => {
    await openNewQuery(page, DATA_SOURCES.postgres);
    await editor(page).click();
    await typeKeys(page, trigger.slice(0, -2));
    await expect(autocompletePopup(page)).toBeVisible();
    await expect.poll(() => autocompleteOffers(page)).toEqual([`${trigger}: Q orders by category, snippet`]);
    // The popup previews the body next to the entry
    await expect(page.locator(".ace_doc-tooltip")).toContainText("select category, count(*) as n from orders");

    await page.keyboard.press("Enter");
    await expect
      .poll(() => getSql(page))
      .toBe("select category, count(*) as n from orders where channel = 'web' group by 1");
    // The placeholder is selected, so typing replaces it
    await typeKeys(page, "partner");
    await expect
      .poll(() => getSql(page))
      .toBe("select category, count(*) as n from orders where channel = 'partner' group by 1");
    await settle(page);

    const { sent, result, error } = await run(page);
    expect(error).toBeNull();
    expect(sent.query).toBe("select category, count(*) as n from orders where channel = 'partner' group by 1");
    const rows = await resultRows(page);
    expect(rows.map((cells) => cells[0]).sort()).toEqual(["Hardware", "Services", "Software", "Training"]);
    expect(result?.data.rows.reduce((sum, cells) => sum + Number(cells.n), 0)).toBeGreaterThan(0);
  });

  test("the full trigger followed by Tab expands the snippet", async ({ page }) => {
    await openNewQuery(page, DATA_SOURCES.postgres);
    await editor(page).click();
    await typeKeys(page, trigger);
    await expect.poll(() => getSql(page)).toBe(trigger);
    // Close the popup first, so that Tab is not "accept the highlighted completion"
    await expect(autocompletePopup(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(autocompletePopup(page)).toBeHidden();
    await expect(page.locator('[data-test="QueryEditor"] .ace_editor')).toHaveClass(/ace_focus/);
    await page.keyboard.press("Tab");
    await expect
      .poll(() => getSql(page))
      .toBe("select category, count(*) as n from orders where channel = 'web' group by 1");
  });

  test("a snippet is edited from the list, and the editor then inserts the new body", async ({ page, api }) => {
    await page.goto("/query_snippets");
    await row(page, trigger).locator(".table-main-title").click();
    await expect(dialog(page).locator(".ant-modal-title")).toHaveText(trigger);
    await expect(fields(page).nth(0)).toHaveValue(trigger);
    await expect(fields(page).nth(1)).toHaveValue("Q orders by category");
    await expect(dialog(page).locator(".ace_line").first()).toContainText("select category, count(*) as n from orders");

    await fields(page).nth(1).click();
    await retype(page, "Q edited: cities");
    await dialog(page).locator(".ace_content").click();
    await page.keyboard.press(`${MOD}+A`);
    await page.keyboard.press("Delete");
    await page.keyboard.type("select name, country from cities order by 1");
    await byTest(page, "SaveQuerySnippetButton").click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(row(page, trigger)).toContainText("Q edited: cities");
    await expect(row(page, trigger).locator(".snippet-content")).toHaveText(
      "select name, country from cities order by 1"
    );
    expect(await findSnippet(api)).toMatchObject({
      description: "Q edited: cities",
      snippet: "select name, country from cities order by 1",
    });

    await openNewQuery(page, DATA_SOURCES.postgres);
    await editor(page).click();
    await typeKeys(page, trigger);
    await expect.poll(() => autocompleteOffers(page)).toEqual([`${trigger}: Q edited: cities, snippet`]);
    await page.keyboard.press("Enter");
    await expect.poll(() => getSql(page)).toBe("select name, country from cities order by 1");
  });

  test("a snippet is deleted after confirmation and is no longer offered in the editor", async ({ page, api }) => {
    await page.goto("/query_snippets");
    await row(page, trigger).getByRole("button", { name: "Delete" }).click();
    const confirm = page.locator(".ant-modal-confirm");
    await expect(confirm).toContainText("Delete Query Snippet");
    await expect(confirm).toContainText("Are you sure you want to delete this query snippet?");
    await confirm.locator(".ant-modal-confirm-btns .ant-btn").filter({ hasText: "Yes" }).click();
    await expect(toast(page).filter({ hasText: "Query snippet deleted successfully." })).toBeVisible();
    await expect(row(page, trigger)).toHaveCount(0);
    expect(await findSnippet(api)).toBeUndefined();
    await dismissToasts(page);

    await openNewQuery(page, DATA_SOURCES.postgres);
    await editor(page).click();
    // "select * from ord" shows that the popup works here; the trigger then offers nothing
    await typeKeys(page, "ord");
    await expect(autocompletePopup(page)).toBeVisible();
    await clearEditor(page);
    await typeKeys(page, trigger);
    await expect.poll(() => getSql(page)).toBe(trigger);
    await expect
      .poll(async () => (await autocompleteOffers(page)).filter((offer) => /snippet/.test(offer)))
      .toEqual([]);
    await page.keyboard.press("Tab");
    expect(await getSql(page)).toContain(trigger);
  });
});
