import type { Locator, Page } from "@playwright/test";
import { expect, test } from "../../support/fixtures";
import { knownIssue } from "../../support/known-issues";
import { byTest, centerOf, drag, retype } from "../../support/ui";
import {
  addTextboxViaApi,
  Created,
  confirmButton,
  confirmDialog,
  createDashboardViaApi,
  doneEditing,
  doneEditingButton,
  getDashboard,
  openWidgetMenu,
  stableBoxes,
  widgetById,
} from "./helpers";

const MARKDOWN = [
  "# D Heading one",
  "## Heading two",
  "",
  "**bold text** and *italic text*",
  "",
  "[a link](https://redash.io/help)",
  "",
  "- item one",
  "- item two",
  "",
  "1. first",
  "2. second",
  "",
  "| col a | col b |",
  "|-------|-------|",
  "| a1 | b1 |",
  "| a2 | b2 |",
  "",
  "~~struck~~ and a bare https://example.com/bare-url",
].join("\n");

const RAW_HTML = "raw: <b>hi</b> <script>alert(1)</script> <img src=x onerror=alert(2)> end";

/** The structure the Markdown above must render to. */
const RENDERED = {
  h1: ["D Heading one"],
  h2: ["Heading two"],
  strong: ["bold text"],
  em: ["italic text"],
  links: ["a link -> https://redash.io/help", "https://example.com/bare-url -> https://example.com/bare-url"],
  ul: ["item one", "item two"],
  ol: ["first", "second"],
  table: ["TH:col a,TH:col b", "TD:a1,TD:b1", "TD:a2,TD:b2"],
  del: ["struck"],
};

function structure(markdown: Locator) {
  return markdown.evaluate((element) => {
    const texts = (selector: string) => Array.from(element.querySelectorAll(selector)).map((e) => e.textContent);
    return {
      h1: texts("h1"),
      h2: texts("h2"),
      strong: texts("strong"),
      em: texts("em"),
      links: Array.from(element.querySelectorAll("a")).map((a) => `${a.textContent} -> ${a.getAttribute("href")}`),
      ul: texts("ul li"),
      ol: texts("ol li"),
      table: Array.from(element.querySelectorAll("table tr")).map((row) =>
        Array.from(row.children)
          .map((cell) => `${cell.tagName}:${cell.textContent}`)
          .join(",")
      ),
      del: texts("del, s"),
    };
  });
}

const textboxDialog = (page: Page) => byTest(page, "TextboxDialog");
const textboxes = (page: Page) => page.locator(".react-grid-item").filter({ has: page.locator(".widget-text") });

async function openForEditing(page: Page, dashboardId: number) {
  await page.goto(`/dashboards/${dashboardId}?edit`);
  await expect(doneEditingButton(page)).toBeVisible();
}

/** Adds a text box through the dialog and returns the id of the new widget. */
async function addTextbox(page: Page, text: string, beforeAdd?: (dialog: Locator) => Promise<void>) {
  await byTest(page, "AddTextboxButton").click();
  const dialog = textboxDialog(page);
  await expect(dialog.locator(".ant-modal-title")).toHaveText("Add Textbox");
  await dialog.locator("textarea").click();
  await page.keyboard.type(text);
  if (beforeAdd) {
    await beforeAdd(dialog);
  }
  const saved = page.waitForResponse((r) => /\/api\/widgets$/.test(r.url()) && r.request().method() === "POST");
  await dialog.locator(".ant-modal-footer button.ant-btn-primary").click();
  const { id } = await (await saved).json();
  await expect(dialog).toBeHidden();
  await expect(widgetById(page, id)).toBeVisible();
  return id as number;
}

test.describe("Dashboard text boxes", () => {
  const created = new Created();
  test.afterAll(async ({ api }) => {
    await created.archiveAll(api);
  });

  test("Markdown renders the same in the dialog preview and on the dashboard", async ({ page, api }) => {
    const dashboard = await createDashboardViaApi(api, created, "D Textbox markdown");
    await openForEditing(page, dashboard.id);
    const id = await addTextbox(page, MARKDOWN, async (dialog) => {
      await expect.poll(() => structure(dialog.locator(".preview.markdown"))).toEqual(RENDERED);
    });
    const markdown = widgetById(page, id).locator(".markdown");
    expect(await structure(markdown)).toEqual(RENDERED);

    await doneEditing(page);
    const widget = (await getDashboard(api, dashboard.id)).widgets[0];
    expect(widget.text).toBe(MARKDOWN);
    expect(widget.visualization).toBeUndefined();

    await page.reload();
    await expect(markdown).toBeVisible();
    expect(await structure(markdown)).toEqual(RENDERED);
  });

  test("raw HTML and script tags stay literal text and nothing is executed", async ({ page, api }) => {
    const dialogs: string[] = [];
    page.on("dialog", (dialog) => {
      dialogs.push(`${dialog.type()}: ${dialog.message()}`);
      dialog.dismiss().catch(() => undefined);
    });
    const dashboard = await createDashboardViaApi(api, created, "D Textbox raw html");
    await openForEditing(page, dashboard.id);

    const literal = async (markdown: Locator) => {
      await expect(markdown.locator("p")).toHaveText(RAW_HTML);
      await expect(markdown.locator("b, script, img")).toHaveCount(0);
      expect(await markdown.evaluate((element) => element.innerHTML)).toContain(
        "raw: &lt;b&gt;hi&lt;/b&gt; &lt;script&gt;alert(1)&lt;/script&gt; &lt;img src=x onerror=alert(2)&gt; end"
      );
    };
    const id = await addTextbox(page, RAW_HTML, (dialog) => literal(dialog.locator(".preview.markdown")));
    await literal(widgetById(page, id).locator(".markdown"));
    await doneEditing(page);

    await page.reload();
    await literal(widgetById(page, id).locator(".markdown"));
    expect((await getDashboard(api, dashboard.id)).widgets[0].text).toBe(RAW_HTML);
    expect(dialogs, "JavaScript dialogs opened by the page").toEqual([]);
  });

  test("the Edit dialog is prefilled, and an edit is saved and shown after a reload", async ({ page, api }) => {
    const dashboard = await createDashboardViaApi(api, created, "D Textbox edit");
    const id = await addTextboxViaApi(api, dashboard.id, MARKDOWN, { col: 0, row: 0, sizeX: 6, sizeY: 9 });
    await page.goto(`/dashboards/${dashboard.id}`);
    const widget = widgetById(page, id);

    const menu = await openWidgetMenu(page, widget);
    await menu.getByText("Edit", { exact: true }).click();
    const dialog = textboxDialog(page);
    await expect(dialog.locator(".ant-modal-title")).toHaveText("Edit Textbox");
    await expect(dialog.locator("textarea")).toHaveValue(MARKDOWN);
    expect(await structure(dialog.locator(".preview.markdown"))).toEqual(RENDERED);

    const edited = "### D edited textbox\n\nSecond version with `code` and **bold**.";
    await dialog.locator("textarea").click();
    await retype(page, edited);
    await dialog.locator(".ant-modal-footer button.ant-btn-primary").click();
    await expect(dialog).toBeHidden();

    const check = async () => {
      await expect(widget.locator(".markdown h3")).toHaveText("D edited textbox");
      await expect(widget.locator(".markdown p")).toHaveText("Second version with code and bold.");
      await expect(widget.locator(".markdown code")).toHaveText("code");
      await expect(widget.locator(".markdown strong")).toHaveText("bold");
      await expect(widget.locator(".markdown h1")).toHaveCount(0);
    };
    await check();
    await expect.poll(async () => (await getDashboard(api, dashboard.id)).widgets[0].text).toBe(edited);
    await page.reload();
    await check();
  });

  test("cancelling an edit with changes asks for confirmation", async ({ page, api }) => {
    const original = "D original text";
    const dashboard = await createDashboardViaApi(api, created, "D Textbox cancel");
    const id = await addTextboxViaApi(api, dashboard.id, original, { col: 0, row: 0, sizeX: 6, sizeY: 3 });
    await page.goto(`/dashboards/${dashboard.id}`);
    const widget = widgetById(page, id);
    const dialog = textboxDialog(page);
    const cancel = dialog.locator(".ant-modal-footer button:not(.ant-btn-primary)");

    // Without changes the dialog just closes
    await (await openWidgetMenu(page, widget)).getByText("Edit", { exact: true }).click();
    await expect(dialog.locator("textarea")).toHaveValue(original);
    await cancel.click();
    await expect(dialog).toBeHidden();
    await expect(confirmDialog(page)).toHaveCount(0);

    await (await openWidgetMenu(page, widget)).getByText("Edit", { exact: true }).click();
    await dialog.locator("textarea").click();
    await retype(page, "D changed but not saved");
    await cancel.click();
    await expect(confirmDialog(page).locator(".ant-modal-confirm-title")).toHaveText("Quit editing?");
    await expect(confirmDialog(page).locator(".ant-modal-confirm-content")).toHaveText(
      "Changes you made so far will not be saved. Are you sure?"
    );

    // "Cancel" in the confirmation goes back to the dialog with the typed text
    await confirmDialog(page).getByRole("button", { name: "Cancel" }).click();
    await expect(confirmDialog(page)).toBeHidden();
    await expect(dialog.locator("textarea")).toHaveValue("D changed but not saved");

    // "Yes, quit" drops the change
    await cancel.click();
    await confirmDialog(page).getByRole("button", { name: "Yes, quit" }).click();
    await expect(dialog).toBeHidden();
    await expect(widget.locator(".markdown")).toHaveText(original);
    expect((await getDashboard(api, dashboard.id)).widgets[0].text).toBe(original);
  });

  test("deleting a text box asks for confirmation and removes it", async ({ page, api }) => {
    const dashboard = await createDashboardViaApi(api, created, "D Textbox delete");
    const keep = await addTextboxViaApi(api, dashboard.id, "D text box that stays", {
      col: 0,
      row: 0,
      sizeX: 6,
      sizeY: 3,
    });
    await openForEditing(page, dashboard.id);
    const victim = await addTextbox(page, "D throwaway textbox");
    await expect(textboxes(page)).toHaveCount(2);

    await byTest(widgetById(page, victim), "WidgetDeleteButton").click();
    await expect(confirmDialog(page).locator(".ant-modal-confirm-title")).toHaveText("Delete Widget");
    await expect(confirmDialog(page).locator(".ant-modal-confirm-content")).toHaveText(
      "Are you sure you want to remove this widget from the dashboard?"
    );
    // Cancel keeps it
    await confirmDialog(page).getByRole("button", { name: "Cancel" }).click();
    await expect(confirmDialog(page)).toBeHidden();
    await expect(textboxes(page)).toHaveCount(2);

    await byTest(widgetById(page, victim), "WidgetDeleteButton").click();
    await confirmButton(page).click();
    await expect(widgetById(page, victim)).toHaveCount(0);
    await expect(textboxes(page)).toHaveCount(1);
    await doneEditing(page);
    expect((await getDashboard(api, dashboard.id)).widgets.map((w) => w.id)).toEqual([keep]);

    await page.reload();
    await expect(widgetById(page, keep)).toBeVisible();
    await expect(textboxes(page)).toHaveCount(1);
  });

  test("a text box is resized taller with its corner handle", async ({ page, api }) => {
    const dashboard = await createDashboardViaApi(api, created, "D Textbox resize");
    const id = await addTextboxViaApi(api, dashboard.id, MARKDOWN, { col: 0, row: 0, sizeX: 6, sizeY: 3 });
    await openForEditing(page, dashboard.id);
    const before = (await stableBoxes(page))[id];

    const handle = await centerOf(widgetById(page, id).locator(".react-resizable-handle"));
    await drag(page, handle, { x: handle.x, y: handle.y + 300 });
    const after = (await stableBoxes(page))[id];
    expect(after).toEqual({ ...before, h: before.h + 300 });

    await doneEditing(page);
    await page.reload();
    await expect(widgetById(page, id)).toBeVisible();
    expect((await stableBoxes(page))[id]).toEqual(after);
    expect((await getDashboard(api, dashboard.id)).widgets[0].options.position).toMatchObject({
      col: 0,
      row: 0,
      sizeX: 6,
      sizeY: 9,
    });
  });

  test("the header cells of a Markdown table do not run together", async ({ page, api }) => {
    knownIssue("markdown-table-header-spacing");
    const dashboard = await createDashboardViaApi(api, created, "D Textbox table");
    const id = await addTextboxViaApi(api, dashboard.id, MARKDOWN, { col: 0, row: 0, sizeX: 6, sizeY: 9 });
    await page.goto(`/dashboards/${dashboard.id}`);
    const table = widgetById(page, id).locator(".markdown table");
    await expect(table.locator("th")).toHaveText(["col a", "col b"]);

    // Neither th nor td has padding or cell spacing here: the body cells only look separated because their text
    // is shorter than the header's. So measure what the reader sees: the space between the two header texts.
    const gap = await table.locator("thead tr").evaluate((row) => {
      const [first, second] = Array.from(row.children).map((cell) => {
        const range = document.createRange();
        range.selectNodeContents(cell);
        return range.getBoundingClientRect();
      });
      return second.left - first.right;
    });
    expect(gap, "pixels between the texts of the two header cells").toBeGreaterThanOrEqual(4);
  });
});
