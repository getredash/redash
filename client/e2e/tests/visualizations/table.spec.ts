import type { Locator, Page } from "@playwright/test";
import { expect, test, uniqueName } from "../../support/fixtures";
import { byTest, centerOf, createVisualizationViaApi } from "../../support/ui";
import {
  bodyRows,
  choose,
  columnCells,
  columnOrder,
  columnPanel,
  columnTexts,
  dragTo,
  editorTab,
  editVisualization,
  headers,
  hoverAt,
  newVisualization,
  openSourcePage,
  openViewPage,
  optionTexts,
  preview,
  type Row,
  resultRows,
  savedVisualization,
  saveVisualization,
  seedQuery,
  table,
  toggleColumn,
  tooltip,
  typeIn,
  visualizationTab,
  SLOW_INSTANCE_TIMEOUT,
} from "./helpers";

// The editor tests make many round trips; on a loaded server they need more than the default 90 seconds
test.describe.configure({ timeout: SLOW_INSTANCE_TIMEOUT });

// 120 orders; `note` holds HTML ("gift <b>wrap</b>") and links ("see https://example.com/o/5")
const SQL = `select o.id, o.created_at, o.category, o.channel, o.quantity, o.amount, o.customer, o.note,
  (o.quantity > 2) as big, json_build_object('qty', o.quantity, 'cat', o.category) as meta,
  '/static/images/redash_icon_small.png' as img
from orders o order by o.id limit 120`;
const COLUMNS = [
  "id",
  "created_at",
  "category",
  "channel",
  "quantity",
  "amount",
  "customer",
  "note",
  "big",
  "meta",
  "img",
];

const pager = (scope: Page | Locator) => scope.locator(".table-visualization-container .ant-pagination");
const activePage = (page: Page) => pager(page).locator(".ant-pagination-item-active");

test.describe("Table visualization", () => {
  let queryId: number;
  let rows: Row[];

  // One query per test: every test adds its own visualization and the tab bar stays short
  test.beforeEach(async ({ api, seed }) => {
    queryId = await seedQuery(api, seed.dataSources.postgres, uniqueName("V table"), SQL);
    rows = await resultRows(api, queryId);
    expect(rows).toHaveLength(120);
  });

  test("the type select offers exactly the twelve visualization types", async ({ page }) => {
    await openSourcePage(page, queryId);
    await byTest(page, "NewVisualization").click();
    expect(await optionTexts(page, "VisualizationType")).toEqual([
      "Chart",
      "Cohort",
      "Counter",
      "Details View",
      "Funnel",
      "Map (Choropleth)",
      "Map (Markers)",
      "Pivot Table",
      "Sankey",
      "Sunburst Sequence",
      "Table",
      "Word Cloud",
    ]);
  });

  test("the eye icon hides a column from the preview and from the saved table", async ({ page, api }) => {
    await openSourcePage(page, queryId);
    await newVisualization(page, "TABLE", "Hidden column");
    await expect.poll(() => headers(preview(page))).toEqual(COLUMNS);

    await byTest(page, "Table.Column.customer.Visibility").click();
    const expected = COLUMNS.filter((name) => name !== "customer");
    await expect.poll(() => headers(preview(page))).toEqual(expected);

    const saved = await saveVisualization(page);
    const stored = await savedVisualization(api, queryId, saved.id);
    expect(stored.options.columns.find((c: { name: string }) => c.name === "customer").visible).toBe(false);
    expect(
      stored.options.columns.filter((c: { visible: boolean }) => c.visible).map((c: { name: string }) => c.name)
    ).toEqual(expected);

    await openViewPage(page, queryId, saved.id);
    await expect.poll(() => headers(page)).toEqual(expected);
  });

  test("dragging a column handle reorders the columns", async ({ page, api }) => {
    await openSourcePage(page, queryId);
    await newVisualization(page, "TABLE", "Reordered columns");
    const handle = (column: string) => columnPanel(page, "Table", column).locator(".drag-handle");

    // A short drag: "amount" to just above "category"
    const from = await centerOf(handle("amount"));
    const to = await centerOf(handle("category"));
    await dragTo(
      page,
      from,
      { x: to.x, y: to.y - 6 },
      {
        whileHeld: async () => {
          // The item follows the mouse while it is held
          const held = await centerOf(handle("amount"));
          expect(Math.abs(held.y - to.y), "the dragged column is at the target while held").toBeLessThan(25);
        },
      }
    );
    await expect
      .poll(() => columnOrder(page, "Table"))
      .toEqual([
        "id",
        "created_at",
        "amount",
        "category",
        "channel",
        "quantity",
        "customer",
        "note",
        "big",
        "meta",
        "img",
      ]);

    // A long drag: "img" from the last place to the second
    const last = await centerOf(handle("img"));
    const second = await centerOf(handle("created_at"));
    await dragTo(page, last, { x: second.x, y: second.y - 6 }, { steps: 30 });
    const order = [
      "id",
      "img",
      "created_at",
      "amount",
      "category",
      "channel",
      "quantity",
      "customer",
      "note",
      "big",
      "meta",
    ];
    await expect.poll(() => columnOrder(page, "Table")).toEqual(order);
    await expect.poll(() => headers(preview(page))).toEqual(order);

    const saved = await saveVisualization(page);
    const stored = await savedVisualization(api, queryId, saved.id);
    const byOrder = [...stored.options.columns].sort((a, b) => a.order - b.order).map((c) => c.name);
    expect(byOrder).toEqual(order);

    await openViewPage(page, queryId, saved.id);
    await expect.poll(() => headers(page)).toEqual(order);
  });

  test("a column can be renamed, aligned and described", async ({ page, api }) => {
    await openSourcePage(page, queryId);
    await newVisualization(page, "TABLE", "Renamed column");

    await toggleColumn(page, "Table", "category");
    await typeIn(page, "Table.Column.category.Title", "Product line");
    await expect.poll(() => headers(preview(page))).toContain("Product line");
    await columnPanel(page, "Table", "category")
      .locator(".ant-radio-button-wrapper")
      .filter({ has: byTest(page, "TextAlignmentSelect.Center") })
      .click();
    await expect
      .poll(async () =>
        (await columnCells(preview(page), "Product line")).evaluateAll((cells) => [
          ...new Set(cells.map((cell) => getComputedStyle(cell).textAlign)),
        ])
      )
      .toEqual(["center"]);
    await typeIn(page, "Table.Column.category.Description", "What was sold");
    await expect(
      table(preview(page)).locator("thead th").filter({ hasText: "Product line" }).locator("svg, i")
    ).not.toHaveCount(0);
    await toggleColumn(page, "Table", "category");

    await toggleColumn(page, "Table", "amount");
    await columnPanel(page, "Table", "amount")
      .locator(".ant-radio-button-wrapper")
      .filter({ has: byTest(page, "TextAlignmentSelect.Left") })
      .click();
    await expect((await columnCells(preview(page), "amount")).first()).toHaveCSS("text-align", "left");

    const saved = await saveVisualization(page);
    const stored = await savedVisualization(api, queryId, saved.id);
    const column = (name: string) => stored.options.columns.find((c: { name: string }) => c.name === name);
    expect(column("category")).toMatchObject({
      title: "Product line",
      alignContent: "center",
      description: "What was sold",
    });
    expect(column("amount").alignContent).toBe("left");

    await openViewPage(page, queryId, saved.id);
    await expect.poll(() => headers(page)).toContain("Product line");
    expect(await headers(page)).not.toContain("category");
    await expect((await columnCells(page, "Product line")).first()).toHaveCSS("text-align", "center");
    await expect((await columnCells(page, "amount")).first()).toHaveCSS("text-align", "left");
    await expect((await columnCells(page, "quantity")).first()).toHaveCSS("text-align", "right");

    // The description is the tooltip of the info icon in the header
    const icon = table(page).locator("thead th").filter({ hasText: "Product line" }).locator("svg, i").first();
    await hoverAt(page, await centerOf(icon));
    await expect(tooltip(page)).toHaveText("What was sold");
  });

  test("HTML in a text column is shown literally by default", async ({ page }) => {
    // The table every query gets has default options: Allow HTML is off
    await openViewPage(page, queryId);
    const cell = (await columnCells(page, "note")).first();
    await expect(cell).toHaveText("gift <b>wrap</b>");
    await expect(cell.locator("b")).toHaveCount(0);
    expect(await cell.innerHTML()).toContain("gift &lt;b&gt;wrap&lt;/b&gt;");
  });

  test("Allow HTML renders the markup, and Highlight links turns URLs into links", async ({ page, api }) => {
    await openSourcePage(page, queryId);
    await newVisualization(page, "TABLE", "HTML column");
    const note = columnPanel(page, "Table", "note");
    const allowHtml = note.locator('[data-test="Table.ColumnEditor.Text.AllowHTML"]');
    const highlightLinks = note.locator('[data-test="Table.ColumnEditor.Text.HighlightLinks"]');
    const firstNote = (await columnCells(preview(page), "note")).first();
    const links = table(preview(page)).locator("tbody td a");

    // Off (the default): the tags are text
    await toggleColumn(page, "Table", "note");
    await expect(allowHtml).not.toBeChecked();
    await expect(highlightLinks).toHaveCount(0);
    await expect(firstNote).toHaveText("gift <b>wrap</b>");
    await expect(firstNote.locator("b")).toHaveCount(0);
    expect(await firstNote.innerHTML()).toContain("gift &lt;b&gt;wrap&lt;/b&gt;");

    // On: a real <b> element
    await allowHtml.click();
    await expect(firstNote.locator("b")).toHaveText("wrap");
    await expect(firstNote).toHaveText("gift wrap");
    await expect(links).toHaveCount(0);

    // "Highlight links" exists only while Allow HTML is on
    await expect(highlightLinks).toBeVisible();
    await highlightLinks.click();
    const onFirstPage = rows.slice(0, 25).filter((row) => /https?:\/\//.test(String(row.note ?? "")));
    expect(onFirstPage.length).toBeGreaterThan(0);
    await expect(links).toHaveCount(onFirstPage.length);
    await expect(links.first()).toHaveAttribute("href", "https://example.com/o/5");

    // Off again: literal text again, the option is gone
    await allowHtml.click();
    await expect(firstNote).toHaveText("gift <b>wrap</b>");
    await expect(firstNote.locator("b")).toHaveCount(0);
    await expect(highlightLinks).toHaveCount(0);
    await expect(links).toHaveCount(0);

    await allowHtml.click();
    await expect(highlightLinks).toBeChecked();
    const saved = await saveVisualization(page);
    const stored = await savedVisualization(api, queryId, saved.id);
    expect(stored.options.columns.find((c: { name: string }) => c.name === "note")).toMatchObject({
      allowHTML: true,
      highlightLinks: true,
    });

    await openViewPage(page, queryId, saved.id);
    const pageNote = (await columnCells(page, "note")).first();
    await expect(pageNote.locator("b")).toHaveText("wrap");
    await expect(table(page).locator('tbody td a[href^="https://example.com/o/"]')).toHaveCount(onFirstPage.length);
  });

  test("number, date, boolean, JSON, image and link columns are formatted as configured", async ({ page, api }) => {
    await openSourcePage(page, queryId);
    await newVisualization(page, "TABLE", "Column types");
    const pv = preview(page);
    const first = async (header: string) => (await columnCells(pv, header)).first();
    const panel = (column: string) => columnPanel(page, "Table", column);
    const field = (column: string, name: string) => panel(column).locator(`[data-test="${name}"]`);

    await toggleColumn(page, "Table", "amount");
    await expect(byTest(page, "Table.Column.amount.DisplayAs")).toContainText("Number");
    await field("amount", "Table.ColumnEditor.Number.Format").fill("");
    await field("amount", "Table.ColumnEditor.Number.Format").pressSequentially("$0,0.0", { delay: 10 });
    await expect(await first("amount")).toHaveText("$229.5");
    await toggleColumn(page, "Table", "amount");

    await toggleColumn(page, "Table", "created_at");
    await expect(byTest(page, "Table.Column.created_at.DisplayAs")).toContainText("Date/Time");
    await field("created_at", "Table.ColumnEditor.DateTime.Format").fill("");
    await field("created_at", "Table.ColumnEditor.DateTime.Format").pressSequentially("DD/MM/YYYY ddd", { delay: 10 });
    await expect(await first("created_at")).toHaveText("21/04/2026 Tue");
    await toggleColumn(page, "Table", "created_at");

    await toggleColumn(page, "Table", "big");
    await expect(byTest(page, "Table.Column.big.DisplayAs")).toContainText("Boolean");
    await field("big", "Table.ColumnEditor.Boolean.True").fill("");
    await field("big", "Table.ColumnEditor.Boolean.True").pressSequentially("Yes!", { delay: 10 });
    // The two labels share one debounced handler: wait for the first to be applied before typing the second
    await expect(await first("big")).toHaveText("Yes!");
    await field("big", "Table.ColumnEditor.Boolean.False").fill("");
    await field("big", "Table.ColumnEditor.Boolean.False").pressSequentially("No!", { delay: 10 });
    const expectedBig = rows.slice(0, 25).map((row) => (row.big ? "Yes!" : "No!"));
    expect(expectedBig).toContain("No!");
    await expect.poll(() => columnTexts(pv, "big")).toEqual(expectedBig);
    await toggleColumn(page, "Table", "big");

    await toggleColumn(page, "Table", "meta");
    await expect(byTest(page, "Table.Column.meta.DisplayAs")).toContainText("Text");
    await choose(page, "Table.Column.meta.DisplayAs", "Table.Column.meta.DisplayAs.json");
    await expect(await first("meta")).toHaveText("{…} // 2 items");
    await toggleColumn(page, "Table", "meta");

    await toggleColumn(page, "Table", "img");
    await choose(page, "Table.Column.img.DisplayAs", "Table.Column.img.DisplayAs.image");
    await field("img", "Table.ColumnEditor.Image.Width").pressSequentially("24", { delay: 10 });
    await expect((await first("img")).locator("img")).toHaveAttribute("width", "24");
    await field("img", "Table.ColumnEditor.Image.Height").pressSequentially("24", { delay: 10 });
    await expect((await first("img")).locator("img")).toHaveAttribute("height", "24");
    await toggleColumn(page, "Table", "img");

    await toggleColumn(page, "Table", "id");
    await choose(page, "Table.Column.id.DisplayAs", "Table.Column.id.DisplayAs.link");
    await field("id", "Table.ColumnEditor.Link.UrlTemplate").fill("");
    await field("id", "Table.ColumnEditor.Link.UrlTemplate").pressSequentially(
      "/queries?order={{ @ }}&cat={{ category }}",
      {
        delay: 5,
      }
    );
    await expect((await first("id")).locator("a")).toHaveAttribute("href", "/queries?order=1&cat=Hardware");
    await field("id", "Table.ColumnEditor.Link.TextTemplate").fill("");
    await field("id", "Table.ColumnEditor.Link.TextTemplate").pressSequentially("Order #{{ @ }}", { delay: 5 });
    await expect(await first("id")).toHaveText("Order #1");
    await toggleColumn(page, "Table", "id");

    const saved = await saveVisualization(page);
    const stored = await savedVisualization(api, queryId, saved.id);
    const column = (name: string) => stored.options.columns.find((c: { name: string }) => c.name === name);
    expect(column("amount")).toMatchObject({ displayAs: "number", numberFormat: "$0,0.0" });
    expect(column("created_at")).toMatchObject({ displayAs: "datetime", dateTimeFormat: "DD/MM/YYYY ddd" });
    expect(column("big")).toMatchObject({ displayAs: "boolean", booleanValues: ["No!", "Yes!"] });
    expect(column("meta").displayAs).toBe("json");
    expect(column("img")).toMatchObject({ displayAs: "image", imageWidth: "24", imageHeight: "24" });
    expect(column("id")).toMatchObject({
      displayAs: "link",
      linkUrlTemplate: "/queries?order={{ @ }}&cat={{ category }}",
      linkTextTemplate: "Order #{{ @ }}",
      linkOpenInNewTab: true,
    });

    await openViewPage(page, queryId, saved.id);
    const onPage = async (header: string) => (await columnCells(page, header)).first();
    await expect(await onPage("amount")).toHaveText("$229.5");
    await expect(await onPage("created_at")).toHaveText("21/04/2026 Tue");
    await expect.poll(() => columnTexts(page, "big")).toEqual(expectedBig);
    await expect(await onPage("meta")).toHaveText("{…} // 2 items");
    const link = (await onPage("id")).locator("a");
    await expect(link).toHaveText("Order #1");
    await expect(link).toHaveAttribute("href", "/queries?order=1&cat=Hardware");
    await expect(link).toHaveAttribute("target", "_blank");
    const image = (await onPage("img")).locator("img");
    await expect(image).toHaveAttribute("src", "/static/images/redash_icon_small.png");
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => [img.width, img.height, img.naturalWidth > 0]))
      .toEqual([24, 24, true]);
  });

  test("the table column editor offers no conditional formatting", async ({ page }) => {
    await openSourcePage(page, queryId);
    await newVisualization(page, "TABLE");
    await toggleColumn(page, "Table", "amount");
    const panel = columnPanel(page, "Table", "amount");
    await expect(panel.locator('[data-test="Table.ColumnEditor.Number.Format"]')).toBeVisible();
    await expect(panel).not.toContainText(/condition/i);
    expect(await optionTexts(page, "Table.Column.amount.DisplayAs")).toEqual([
      "Text",
      "Number",
      "Date/Time",
      "Boolean",
      "Link",
      "Image",
      "JSON",
    ]);
  });

  test("items per page sets the page size of the saved table", async ({ page, api }) => {
    await openSourcePage(page, queryId);
    await newVisualization(page, "TABLE", "Ten per page");
    await expect(bodyRows(preview(page))).toHaveCount(25);
    await editorTab(page, "Grid");
    await choose(page, "Table.ItemsPerPage", "Table.ItemsPerPage.10");
    await expect(bodyRows(preview(page))).toHaveCount(10);
    await expect(pager(preview(page)).locator(".ant-pagination-item").last()).toHaveText("12");

    const saved = await saveVisualization(page);
    expect((await savedVisualization(api, queryId, saved.id)).options.itemsPerPage).toBe(10);
    await expect(bodyRows(page)).toHaveCount(10);

    await editVisualization(page);
    await editorTab(page, "Grid");
    await choose(page, "Table.ItemsPerPage", "Table.ItemsPerPage.25");
    await saveVisualization(page);
    expect((await savedVisualization(api, queryId, saved.id)).options.itemsPerPage).toBe(25);
    await expect(bodyRows(page)).toHaveCount(25);
    await expect(pager(page).locator(".ant-pagination-item").last()).toHaveText("5");
  });

  test("the search box appears for columns marked Use for search and filters the rows", async ({ page, api }) => {
    await openSourcePage(page, queryId);
    await newVisualization(page, "TABLE", "Searchable");
    const search = (scope: Page | ReturnType<typeof preview>) => table(scope).locator(".ant-input-search input");
    await expect(bodyRows(preview(page))).toHaveCount(25);
    await expect(search(preview(page))).toHaveCount(0);

    await toggleColumn(page, "Table", "category");
    await typeIn(page, "Table.Column.category.Title", "Product line");
    await expect.poll(() => headers(preview(page))).toContain("Product line");
    await byTest(page, "Table.Column.category.UseForSearch").click();
    await expect(search(preview(page))).toHaveAttribute("placeholder", "Search Product line...");
    await toggleColumn(page, "Table", "category");
    await toggleColumn(page, "Table", "note");
    await byTest(page, "Table.Column.note.UseForSearch").click();
    await expect(search(preview(page))).toHaveAttribute("placeholder", "Search Product line and note...");
    await editorTab(page, "Grid");
    await choose(page, "Table.ItemsPerPage", "Table.ItemsPerPage.10");

    const saved = await saveVisualization(page);
    const stored = await savedVisualization(api, queryId, saved.id);
    expect(
      stored.options.columns.filter((c: { allowSearch: boolean }) => c.allowSearch).map((c: { name: string }) => c.name)
    ).toEqual(["category", "note"]);

    await openViewPage(page, queryId, saved.id);
    await expect(search(page)).toHaveAttribute("placeholder", "Search Product line and note...");
    await search(page).click();
    await page.keyboard.type("wrap", { delay: 40 });
    const matching = rows.filter((row) => /wrap/i.test(`${row.category} ${row.note ?? ""}`));
    expect(matching).toHaveLength(18);
    await expect(bodyRows(page)).toHaveCount(10);
    await expect.poll(() => columnTexts(page, "id")).toEqual(matching.slice(0, 10).map((row) => String(row.id)));
    await expect(pager(page).locator(".ant-pagination-item")).toHaveText(["1", "2"]);
    await pager(page).locator(".ant-pagination-item-2").click();
    await expect.poll(() => columnTexts(page, "id")).toEqual(matching.slice(10).map((row) => String(row.id)));

    // A column that is not searchable does not match
    await search(page).fill("");
    await expect(pager(page).locator(".ant-pagination-item").last()).toHaveText("12");
    await search(page).click();
    await page.keyboard.type("partner", { delay: 40 });
    await expect(bodyRows(page)).toHaveCount(0);
  });

  test.describe("on the query page", () => {
    let visualizationId: number;

    test.beforeEach(async ({ api, page }) => {
      visualizationId = await createVisualizationViaApi(api, queryId, {
        type: "TABLE",
        name: "Ten per page",
        options: { itemsPerPage: 10 },
      });
      await openViewPage(page, queryId, visualizationId);
      await expect(bodyRows(page)).toHaveCount(10);
    });

    test("clicking a header sorts, shift-click adds a second sort column", async ({ page }) => {
      const header = (name: string) =>
        table(page)
          .locator("thead th")
          .filter({ hasText: new RegExp(`^${name}$`) });
      const sorted = (compare: (a: Row, b: Row) => number) => [...rows].sort(compare).slice(0, 10);
      const quantity = (row: Row) => Number(row.quantity);
      const amount = (row: Row) => Number(row.amount);

      await header("quantity").click();
      await expect
        .poll(() => columnTexts(page, "quantity"))
        .toEqual(sorted((a, b) => quantity(a) - quantity(b)).map((row) => String(row.quantity)));
      await expect(header("quantity")).toHaveAttribute("aria-sort", "ascending");
      expect(new Set(await columnTexts(page, "quantity"))).toEqual(new Set(["1"]));

      await header("quantity").click();
      await expect(header("quantity")).toHaveAttribute("aria-sort", "descending");
      await expect.poll(async () => new Set(await columnTexts(page, "quantity"))).toEqual(new Set(["12"]));

      // Shift-click: quantity stays the first key, amount becomes the second
      await header("amount").click({ modifiers: ["Shift"] });
      await expect(header("amount")).toHaveAttribute("aria-sort", "ascending");
      await expect(header("quantity")).toHaveAttribute("aria-sort", "descending");
      const ids = (list: Row[]) => list.map((row) => String(row.id));
      await expect
        .poll(() => columnTexts(page, "id"))
        .toEqual(ids(sorted((a, b) => quantity(b) - quantity(a) || amount(a) - amount(b))));
      const ascending = sorted((a, b) => quantity(b) - quantity(a) || amount(a) - amount(b)).map(amount);
      expect(ascending[0]).toBe(145.1);
      expect(await columnTexts(page, "amount")).toEqual(
        ascending.map((value) => value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
      );
      // Numbered badges show the order of the sort keys
      await expect(header("quantity").locator(".table-visualization-heading")).toHaveAttribute(
        "data-sort-column-index",
        "1"
      );
      await expect(header("amount").locator(".table-visualization-heading")).toHaveAttribute(
        "data-sort-column-index",
        "2"
      );

      await header("amount").click({ modifiers: ["Shift"] });
      await expect(header("amount")).toHaveAttribute("aria-sort", "descending");
      await expect
        .poll(() => columnTexts(page, "id"))
        .toEqual(ids(sorted((a, b) => quantity(b) - quantity(a) || amount(b) - amount(a))));
    });

    test("the pagination controls move between the pages", async ({ page }) => {
      const idsOfPage = (number: number) => rows.slice((number - 1) * 10, number * 10).map((row) => String(row.id));
      await expect(activePage(page)).toHaveText("1");

      await pager(page).locator(".ant-pagination-item-3").click();
      await expect(activePage(page)).toHaveText("3");
      await expect.poll(() => columnTexts(page, "id")).toEqual(idsOfPage(3));

      await pager(page).locator(".ant-pagination-next").click();
      await expect(activePage(page)).toHaveText("4");
      await expect.poll(() => columnTexts(page, "id")).toEqual(idsOfPage(4));

      await pager(page).locator(".ant-pagination-prev").click();
      await expect(activePage(page)).toHaveText("3");
      await expect.poll(() => columnTexts(page, "id")).toEqual(idsOfPage(3));

      await pager(page).locator(".ant-pagination-item").last().click();
      await expect(activePage(page)).toHaveText("12");
      await expect.poll(() => columnTexts(page, "id")).toEqual(idsOfPage(12));
      await expect(bodyRows(page)).toHaveCount(10);
      await expect(pager(page).locator(".ant-pagination-next")).toHaveClass(/ant-pagination-disabled/);
    });
  });

  test("the tab shows the name the table was saved with", async ({ page }) => {
    await openSourcePage(page, queryId);
    await newVisualization(page, "TABLE", "Orders table");
    const saved = await saveVisualization(page);
    await expect(visualizationTab(page, saved.id)).toHaveText("Orders table");
    await expect(bodyRows(page)).toHaveCount(25);
  });
});
