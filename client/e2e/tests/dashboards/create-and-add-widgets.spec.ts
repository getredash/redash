import { expect, test, uniqueName } from "../../support/fixtures";
import { knownIssue } from "../../support/known-issues";
import { byTest, createQueryViaApi, retype, selectOptions } from "../../support/ui";
import {
  addWidget,
  addWidgetViaApi,
  Created,
  counterValue,
  createDashboard,
  createDashboardViaApi,
  dashboardLevel,
  dashboardParameters,
  dashboardTitle,
  doneEditing,
  doneEditingButton,
  getDashboard,
  gridItems,
  mappingRows,
  overlaps,
  plotData,
  type SeededQuery,
  seedQueries,
  settled,
  shownParameters,
  stableBoxes,
  VIZ,
  widgetById,
  widgetRows,
} from "./helpers";

test.describe("Creating a dashboard and adding widgets", () => {
  const created = new Created();
  let byCategory: SeededQuery;
  let tableRows: SeededQuery;
  let citiesMap: SeededQuery;

  test.beforeAll(async ({ api, seed }) => {
    byCategory = await seedQueries.byCategory(api, created, seed.dataSources.postgres);
    tableRows = await seedQueries.tableRows(api, created, seed.dataSources.postgres);
    citiesMap = await seedQueries.citiesMap(api, created, seed.dataSources.postgres);
  });
  test.afterAll(async ({ api }) => {
    await created.archiveAll(api);
  });

  test("Create > New Dashboard opens the new, unpublished dashboard in edit mode", async ({ page, api }) => {
    const name = uniqueName("D Created");
    const id = await createDashboard(page, name);
    created.dashboards.push(id);

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await expect(page).toHaveURL(new RegExp(`/dashboards/${id}-${slug}\\?edit$`));
    await expect(dashboardTitle(page)).toHaveText(name);
    await expect(doneEditingButton(page)).toBeVisible();
    await expect(byTest(page, "AddWidgetButton")).toBeVisible();
    await expect(byTest(page, "AddTextboxButton")).toBeVisible();
    await expect(gridItems(page)).toHaveCount(0);

    const dashboard = await getDashboard(api, id);
    expect(dashboard).toMatchObject({ name, is_draft: true, is_archived: false, widgets: [] });
  });

  test("the title is renamed in place while editing", async ({ page, api }) => {
    const dashboard = await createDashboardViaApi(api, created, "D Rename me");
    const newName = uniqueName("D Renamed");
    await page.goto(`/dashboards/${dashboard.id}?edit`);
    await expect(doneEditingButton(page)).toBeVisible();

    await page.locator(".dashboard-header h3 .edit-in-place").click();
    await retype(page, newName);
    await page.keyboard.press("Enter");
    await expect(dashboardTitle(page)).toHaveText(newName);
    await expect.poll(async () => (await getDashboard(api, dashboard.id)).name).toBe(newName);

    await doneEditing(page);
    await page.reload();
    await expect(dashboardTitle(page)).toHaveText(newName);
  });

  test("the title cannot be edited outside edit mode", async ({ page, api }) => {
    const dashboard = await createDashboardViaApi(api, created, "D Fixed title");
    await page.goto(`/dashboards/${dashboard.id}`);
    await expect(dashboardTitle(page)).toHaveText(dashboard.name);
    await dashboardTitle(page).click();
    await expect(page.locator(".dashboard-header h3 input, .dashboard-header h3 textarea")).toHaveCount(0);
  });

  test("the Add Widget dialog finds a query by name and lists its visualizations by type", async ({ page, api }) => {
    const dashboard = await createDashboardViaApi(api, created, "D Add dialog");
    await page.goto(`/dashboards/${dashboard.id}?edit`);
    await byTest(page, "AddWidgetButton").click();
    const dialog = page.locator(".ant-modal").filter({ has: byTest(page, "AddWidgetDialog") });
    await dialog.getByPlaceholder("Search a query by name").click();
    await page.keyboard.type(byCategory.name);
    const results = dialog.locator(".query-selector-result");
    await expect(results.filter({ hasText: byCategory.name })).toHaveCount(1);
    await results.filter({ hasText: byCategory.name }).click();

    await expect(dialog.getByText("Choose Visualization")).toBeVisible();
    // Which visualization is preselected and the order of the groups follow the order in which the API returns
    // the query's visualizations, which is not fixed: so compare the option list without its order
    await dialog.locator(".form-group .ant-select").first().click();
    const dropdown = page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)");
    await expect(dropdown.locator(".ant-select-item")).toHaveCount(7);
    const options = await dropdown.locator(".ant-select-item").allInnerTexts();
    expect([...options].sort()).toEqual(["CHART", "COUNTER", "TABLE", "Table", VIZ.bar, VIZ.counter, VIZ.pie].sort());
    // Every visualization is listed under the heading of its type
    const under = (heading: string) => {
      const start = options.indexOf(heading) + 1;
      const end = options.findIndex((option, index) => index >= start && /^[A-Z]+$/.test(option));
      return options.slice(start, end < 0 ? undefined : end).sort();
    };
    expect(under("TABLE")).toEqual(["Table"]);
    expect(under("CHART")).toEqual([VIZ.bar, VIZ.pie].sort());
    expect(under("COUNTER")).toEqual([VIZ.counter]);
    await selectOptions(page).filter({ hasText: VIZ.pie }).click();
    await expect(dialog.locator(".form-group .ant-select").first()).toContainText(VIZ.pie);

    // Nothing is added when the dialog is cancelled
    await dialog.locator(".ant-modal-footer button:not(.ant-btn-primary)").click();
    await expect(dialog).toBeHidden();
    await expect(gridItems(page)).toHaveCount(0);
    expect((await getDashboard(api, dashboard.id)).widgets).toHaveLength(0);
  });

  test("a query parameter becomes a dashboard parameter by default", async ({ page, api }) => {
    const dashboard = await createDashboardViaApi(api, created, "D Default mapping");
    await page.goto(`/dashboards/${dashboard.id}?edit`);
    const id = await addWidget(page, tableRows.name, undefined, async () => {
      expect(await mappingRows(page)).toEqual(["rows {{ rows }} 12 Dashboard rows"]);
    });
    await settled(page);
    await expect.poll(() => shownParameters(dashboardParameters(page))).toEqual([["rows", "12"]]);
    await expect(widgetById(page, id).locator("tbody tr.ant-table-row")).toHaveCount(12);
    const widget = (await getDashboard(api, dashboard.id)).widgets[0];
    expect(widget.options.parameterMappings.rows).toMatchObject({ type: "dashboard-level", mapTo: "rows" });
  });

  test("a widget added while another widget was still loading shows up without a reload", async ({
    page,
    api,
    seed,
  }) => {
    // The Add Widget dialog keeps the dashboard object of the moment it was opened; when another widget finishes
    // loading meanwhile the page replaces that object, and the added widget is saved but not rendered
    knownIssue("added-widget-hidden-until-reload");
    const dashboard = await createDashboardViaApi(api, created, "D Add while loading");
    // Not run yet, so the dashboard runs it when it opens: the widget shows a spinner for a few seconds
    const slow = await createQueryViaApi(api, {
      name: uniqueName("D slow query"),
      dataSourceId: seed.dataSources.postgres,
      // Unique text, or Redash would answer from the cached result of an earlier run of this test
      sql: `select pg_sleep({{ seconds }}), '${uniqueName("slow")}' as marker`,
      options: { parameters: [{ name: "seconds", title: "seconds", type: "number", value: 4, global: false }] },
      run: false,
    });
    created.queries.push(slow.id);
    const slowTable = (await api.get(`/api/queries/${slow.id}`)).visualizations[0].id;
    const slowWidget = await addWidgetViaApi(
      api,
      dashboard.id,
      slowTable,
      { col: 0, row: 0, sizeX: 6, sizeY: 6 },
      dashboardLevel("seconds")
    );

    await page.goto(`/dashboards/${dashboard.id}?edit`);
    await expect(widgetById(page, slowWidget).locator(".spinner-container")).toBeVisible();
    await byTest(page, "AddWidgetButton").click();
    const dialog = page.locator(".ant-modal").filter({ has: byTest(page, "AddWidgetDialog") });
    await dialog.getByPlaceholder("Search a query by name").fill(byCategory.name);
    await dialog.locator(".query-selector-result").filter({ hasText: byCategory.name }).click();
    await expect(dialog.getByText("Choose Visualization")).toBeVisible();
    // The first widget finishes loading while the dialog is open
    await expect(widgetById(page, slowWidget).locator("tbody tr.ant-table-row")).toHaveCount(1, { timeout: 30_000 });

    const added = page.waitForResponse((r) => /\/api\/widgets$/.test(r.url()) && r.request().method() === "POST");
    await dialog.locator(".ant-modal-footer button.ant-btn-primary").click();
    const { id } = await (await added).json();
    await expect(dialog).toBeHidden();
    expect((await getDashboard(api, dashboard.id)).widgets.map((w) => w.id)).toContain(id);
    await expect(widgetById(page, id)).toBeVisible();
    await expect(gridItems(page)).toHaveCount(2);
  });

  test("several visualizations of one query, a table and a map are added without overlap and survive a reload", async ({
    page,
    api,
  }) => {
    test.setTimeout(150_000);
    const name = uniqueName("D Main");
    const dashboardId = await createDashboard(page, name);
    created.dashboards.push(dashboardId);

    const bar = await addWidget(page, byCategory.name, VIZ.bar);
    const pie = await addWidget(page, byCategory.name, VIZ.pie);
    const counter = await addWidget(page, byCategory.name, VIZ.counter);
    const table = await addWidget(page, tableRows.name);
    const map = await addWidget(page, citiesMap.name, VIZ.map);
    await settled(page);
    await doneEditing(page);

    const checkContent = async () => {
      await settled(page);
      await expect(gridItems(page)).toHaveCount(5);
      await expect
        .poll(() => plotData(widgetById(page, bar)))
        .toEqual([{ x: ["Hardware", "Services", "Software", "Training"], y: [100671, 102848, 86294, 78980] }]);
      await expect
        .poll(async () => (await plotData(widgetById(page, pie)))[0]?.x)
        .toEqual(["Hardware", "Services", "Software", "Training"]);
      await expect(counterValue(widgetById(page, counter))).toHaveText("100,671");
      await expect(widgetById(page, table).locator("tbody tr.ant-table-row")).toHaveCount(12);
      expect((await widgetRows(widgetById(page, table)))[0]).toEqual([
        "1",
        "Hardware",
        "direct",
        "229.54",
        "customer-013",
      ]);
      await expect(widgetById(page, map).locator(".leaflet-container")).toBeVisible();
      await expect(widgetById(page, map).locator(".leaflet-marker-icon").first()).toBeVisible();
    };
    await checkContent();

    // New widgets are placed next to and below each other: where the first free space of their size is
    const dashboard = await getDashboard(api, dashboardId);
    expect(dashboard.widgets.map((w) => w.visualization?.name).sort()).toEqual(
      ["Table", VIZ.bar, VIZ.counter, VIZ.map, VIZ.pie].sort()
    );
    const position = (id: number) => {
      const { col, row, sizeX, sizeY } = dashboard.widgets.find((w) => w.id === id)?.options.position || {};
      return { col, row, sizeX, sizeY };
    };
    expect(position(bar)).toEqual({ col: 0, row: 0, sizeX: 6, sizeY: 8 });
    expect(position(pie)).toEqual({ col: 6, row: 0, sizeX: 6, sizeY: 8 });
    expect(position(counter)).toEqual({ col: 0, row: 8, sizeX: 4, sizeY: 5 });
    expect(position(table)).toMatchObject({ col: 4, row: 8, sizeX: 6 });
    expect(position(map)).toMatchObject({ col: 0, sizeX: 6, sizeY: 8 });

    const before = await stableBoxes(page);
    expect(overlaps(before)).toEqual([]);

    await page.reload();
    await checkContent();
    const after = await stableBoxes(page);
    expect(after).toEqual(before);
    expect(overlaps(after)).toEqual([]);
  });
});
