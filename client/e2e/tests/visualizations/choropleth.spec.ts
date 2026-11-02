import type { Locator, Page } from "@playwright/test";
import { expect, type RedashApi, test, uniqueName } from "../../support/fixtures";
import { knownIssue } from "../../support/known-issues";
import { byTest, centerOf, createVisualizationViaApi } from "../../support/ui";
import {
  choose,
  dragTo,
  editor,
  editorTab,
  hoverAt,
  mapTooltip,
  newVisualization,
  openSourcePage,
  openViewPage,
  optionTexts,
  overtype,
  parkMouse,
  pickColor,
  pointOn,
  preview,
  type Row,
  resultRows,
  savedVisualization,
  saveVisualization,
  seedQuery,
  typeIn,
  waitUntilStill,
  SLOW_INSTANCE_TIMEOUT,
} from "./helpers";

// The editor tests make many round trips; on a loaded server they need more than the default 90 seconds
test.describe.configure({ timeout: SLOW_INSTANCE_TIMEOUT });

// Revenue of the 12 countries that have a city; 12 different values between 21,102.29 and 41,724.96
const SQL = `select c.country_code, c.country, count(*) as orders, round(sum(o.amount)::numeric, 2) as revenue
from orders o join cities c on c.id = o.city_id group by 1, 2 order by 1`;
const USA_SQL = `select * from (values ('CA', 'California', 120), ('TX', 'Texas', 90), ('NY', 'New York', 150),
  ('FL', 'Florida', 60), ('WA', 'Washington', 30), ('AK', 'Alaska', 45), ('HI', 'Hawaii', 75)) as t(state, state_name, value)`;

const NO_VALUE = "#dddddd";
const EQUIDISTANT_5 = ["41,724.96", "36,569.29", "31,413.63", "26,257.96", "21,102.29"];
const BY_COUNTRY = { mapType: "countries", keyColumn: "country_code", targetField: "iso_a2", valueColumn: "revenue" };

const map = (scope: Page | Locator) => scope.locator(".map-visualization-container").first();
const shapes = (scope: Page | Locator) => map(scope).locator("path.leaflet-interactive");
const legendItems = (scope: Page | Locator) => map(scope).locator(".choropleth-visualization-legend .legend-item");
const popup = (scope: Page | Locator) => map(scope).locator(".leaflet-popup-content");

/** How many shapes have each fill colour. */
function fills(scope: Page | Locator): Promise<Record<string, number>> {
  return shapes(scope).evaluateAll((paths) => {
    const count: Record<string, number> = {};
    for (const path of paths) {
      const fill = (path.getAttribute("fill") || "").toLowerCase();
      count[fill] = (count[fill] || 0) + 1;
    }
    return count;
  });
}

/** The colour classes in use: fill colours other than the "no value" colour, with their number of shapes. */
async function classes(scope: Page | Locator, noValue = NO_VALUE): Promise<number[]> {
  const all = await fills(scope);
  return Object.entries(all)
    .filter(([color]) => color !== noValue)
    .map(([, count]) => count);
}

const legendTexts = async (scope: Page | Locator) =>
  (await legendItems(scope).allTextContents()).map((text) => text.trim());

/** The corner of the map the legend is in, e.g. "bottom left". */
function legendCorner(scope: Page | Locator): Promise<string> {
  return map(scope)
    .locator(".choropleth-visualization-legend")
    .evaluate((legend) =>
      (legend.closest(".leaflet-control")?.parentElement?.className || "").replace(/leaflet-/g, "")
    );
}

type Snapshot = { box: number[]; paths: (number[] | null)[] };

/**
 * Where every shape is drawn, relative to the centre of the map. Shapes cut by the edge are left out. Two
 * snapshots compared with `change` tell how the view changed.
 */
function snapshot(page: Page): Promise<Snapshot> {
  return map(page).evaluate((container) => {
    const frame = container.getBoundingClientRect();
    return {
      box: [Math.round(frame.width), Math.round(frame.height)],
      paths: Array.from(container.querySelectorAll("path.leaflet-interactive")).map((path) => {
        const box = path.getBoundingClientRect();
        const inside =
          box.width > 6 &&
          box.left > frame.left + 4 &&
          box.right < frame.right - 4 &&
          box.top > frame.top + 4 &&
          box.bottom < frame.bottom - 4;
        return inside
          ? [
              box.left + box.width / 2 - (frame.left + frame.width / 2),
              box.top + box.height / 2 - (frame.top + frame.height / 2),
              box.width,
            ]
          : null;
      }),
    };
  });
}

/** `scale`: how much bigger the shapes are in `b` than in `a`; `dx`: how far they moved sideways, in pixels of `b`. */
function change(a: Snapshot, b: Snapshot): { scale: number; dx: number } {
  const median = (values: number[]) => [...values].sort((x, y) => x - y)[Math.floor(values.length / 2)];
  const pairs = a.paths.flatMap((before, index) => {
    const after = b.paths[index];
    return before && after ? [[before, after]] : [];
  });
  if (pairs.length === 0) {
    return { scale: Number.NaN, dx: Number.NaN };
  }
  const scale = median(pairs.map(([before, after]) => after[2] / before[2]));
  const dx = median(pairs.map(([before, after]) => after[0] - before[0] * scale));
  return { scale: Math.round(scale * 1000) / 1000, dx: Math.round(dx) || 0 };
}

test.describe("Map (Choropleth) visualization", () => {
  let queryId: number;
  let rows: Row[];

  test.beforeEach(async ({ api, seed }) => {
    queryId = await seedQuery(api, seed.dataSources.postgres, uniqueName("V choropleth"), SQL);
    rows = await resultRows(api, queryId);
    expect(rows).toHaveLength(12);
  });

  /** A saved choropleth of revenue per country, opened on the query page. */
  async function openSaved(page: Page, api: RedashApi, options: Record<string, unknown> = {}) {
    const id = await createVisualizationViaApi(api, queryId, {
      type: "CHOROPLETH",
      name: "Choropleth",
      options: { ...BY_COUNTRY, ...options },
    });
    await openViewPage(page, queryId, id);
    await expect(legendItems(page)).toHaveCount(5);
    await expect.poll(async () => (await classes(page)).reduce((sum, count) => sum + count, 0)).toBe(12);
    await waitUntilStill(map(page));
    return id;
  }

  /** A new choropleth in the editor with the key, target field and value column chosen. */
  async function newChoropleth(page: Page, name: string) {
    await openSourcePage(page, queryId);
    await newVisualization(page, "CHOROPLETH", name);
    await expect(shapes(preview(page))).toHaveCount(176);
    await choose(page, "Choropleth.Editor.KeyColumn", "Choropleth.Editor.KeyColumn.country_code");
    await choose(page, "Choropleth.Editor.TargetField", "Choropleth.Editor.TargetField.iso_a2");
    await choose(page, "Choropleth.Editor.ValueColumn", "Choropleth.Editor.ValueColumn.revenue");
    await expect.poll(() => legendTexts(preview(page))).toEqual(EQUIDISTANT_5);
  }

  test("countries are matched by ISO code and by name", async ({ page, api }) => {
    await openSourcePage(page, queryId);
    await newVisualization(page, "CHOROPLETH", "Choropleth A");
    const pv = preview(page);
    // Nothing is mapped yet: every country has the "no value" colour and there is no legend
    await expect.poll(() => fills(pv)).toEqual({ [NO_VALUE]: 176 });
    await expect(legendItems(pv)).toHaveCount(0);
    expect(await optionTexts(page, "Choropleth.Editor.MapType")).toEqual(["Countries", "USA", "Japan/Prefectures"]);

    await choose(page, "Choropleth.Editor.KeyColumn", "Choropleth.Editor.KeyColumn.country_code");
    expect(await optionTexts(page, "Choropleth.Editor.TargetField")).toEqual([
      "Abbreviated name",
      "Short name",
      "Full name",
      "ISO code (2 letters)",
      "ISO code (3 letters)",
      "ISO code (3 digits)",
    ]);
    await choose(page, "Choropleth.Editor.TargetField", "Choropleth.Editor.TargetField.iso_a2");
    await choose(page, "Choropleth.Editor.ValueColumn", "Choropleth.Editor.ValueColumn.revenue");
    await expect.poll(() => legendTexts(pv)).toEqual(EQUIDISTANT_5);
    const byCode = await fills(pv);
    expect(byCode[NO_VALUE]).toBe(164);
    // 12 countries in 5 colour classes
    expect((await classes(pv)).sort()).toEqual([1, 2, 2, 3, 4]);

    await choose(page, "Choropleth.Editor.KeyColumn", "Choropleth.Editor.KeyColumn.country");
    await expect.poll(() => fills(pv)).toEqual({ [NO_VALUE]: 176 });
    await choose(page, "Choropleth.Editor.TargetField", "Choropleth.Editor.TargetField.name");
    await expect.poll(() => fills(pv)).toEqual(byCode);
    await expect.poll(() => legendTexts(pv)).toEqual(EQUIDISTANT_5);

    const saved = await saveVisualization(page);
    expect((await savedVisualization(api, queryId, saved.id)).options).toMatchObject({
      mapType: "countries",
      keyColumn: "country",
      targetField: "name",
      valueColumn: "revenue",
    });
    await openViewPage(page, queryId, saved.id);
    await expect.poll(() => fills(page)).toEqual(byCode);
    await expect.poll(() => legendTexts(page)).toEqual(EQUIDISTANT_5);
  });

  test("the number of colour steps and the colours can be changed", async ({ page, api }) => {
    await newChoropleth(page, "Choropleth colours");
    const pv = preview(page);
    await editorTab(page, "Colors");

    await overtype(byTest(page, "Choropleth.Editor.ColorSteps"), "3");
    await expect.poll(() => legendTexts(pv)).toEqual(["41,724.96", "31,413.63", "21,102.29"]);
    expect((await classes(pv)).sort()).toEqual([1, 5, 6]);
    await overtype(byTest(page, "Choropleth.Editor.ColorSteps"), "8");
    await expect(legendItems(pv)).toHaveCount(8);
    expect(await legendTexts(pv)).toEqual([
      "41,724.96",
      "38,778.86",
      "35,832.77",
      "32,886.67",
      "29,940.58",
      "26,994.48",
      "24,048.39",
      "21,102.29",
    ]);
    // 12 values in 8 equal ranges: one range holds no country
    expect((await classes(pv)).sort()).toEqual([1, 1, 1, 2, 2, 2, 3]);

    await pickColor(page, "Choropleth.Editor.Colors.Min", "FFF3B0");
    await pickColor(page, "Choropleth.Editor.Colors.Max", "B30000");
    await pickColor(page, "Choropleth.Editor.Colors.NoValue", "EEEEEE");
    await pickColor(page, "Choropleth.Editor.Colors.Background", "D6EAF8");
    await pickColor(page, "Choropleth.Editor.Colors.Borders", "555555");
    await expect.poll(async () => (await fills(pv))["#eeeeee"]).toBe(164);
    const coloured = await fills(pv);
    // The lowest and the highest class have exactly the min and max colour
    expect(coloured["#fff3b0"]).toBe(1);
    expect(coloured["#b30000"]).toBe(2);
    expect(Object.keys(coloured)).toHaveLength(8);
    await expect(shapes(pv).first()).toHaveAttribute("stroke", /^#555555$/i);
    await expect(map(pv)).toHaveCSS("background-color", "rgb(214, 234, 248)");
    // The legend shows the same colours
    await expect(legendItems(pv).first().locator(".legend-item-color, div, span").first()).toBeVisible();

    const saved = await saveVisualization(page);
    expect((await savedVisualization(api, queryId, saved.id)).options).toMatchObject({
      steps: 8,
      colors: { min: "#FFF3B0", max: "#B30000", noValue: "#EEEEEE", background: "#D6EAF8", borders: "#555555" },
    });
    await openViewPage(page, queryId, saved.id);
    await expect.poll(() => fills(page)).toEqual(coloured);
    await expect(map(page)).toHaveCSS("background-color", "rgb(214, 234, 248)");
  });

  test("equidistant and quantile clustering use every colour step", async ({ page, api }) => {
    await newChoropleth(page, "Choropleth clustering");
    const pv = preview(page);
    await editorTab(page, "Colors");

    await choose(page, "Choropleth.Editor.ClusteringMode", "Choropleth.Editor.ClusteringMode.q");
    await expect.poll(() => legendTexts(pv)).not.toEqual(EQUIDISTANT_5);
    await expect(legendItems(pv)).toHaveCount(5);
    // Quantiles: every one of the 5 classes holds countries
    await expect.poll(async () => (await classes(pv)).sort()).toEqual([1, 2, 3, 3, 3]);

    await choose(page, "Choropleth.Editor.ClusteringMode", "Choropleth.Editor.ClusteringMode.e");
    await expect.poll(() => legendTexts(pv)).toEqual(EQUIDISTANT_5);
    await expect.poll(async () => (await classes(pv)).sort()).toEqual([1, 2, 2, 3, 4]);

    await choose(page, "Choropleth.Editor.ClusteringMode", "Choropleth.Editor.ClusteringMode.q");
    const saved = await saveVisualization(page);
    expect((await savedVisualization(api, queryId, saved.id)).options.clusteringMode).toBe("q");
  });

  test("k-means clustering uses more than two colour classes", async ({ page }) => {
    knownIssue("choropleth-kmeans-two-classes");
    await newChoropleth(page, "Choropleth k-means");
    const pv = preview(page);
    await editorTab(page, "Colors");
    await choose(page, "Choropleth.Editor.ClusteringMode", "Choropleth.Editor.ClusteringMode.k");
    // The legend changes when the mode is applied (k-means limits are not the equidistant ones)
    await expect.poll(() => legendTexts(pv)).not.toEqual(EQUIDISTANT_5);

    // 12 different values and 5 steps: a clustering into 5 (at the very least 3) classes
    expect((await classes(pv)).length).toBeGreaterThan(2);
    expect((await legendTexts(pv)).length).toBeGreaterThan(2);
  });

  test("legend, value format and the tooltip and popup templates can be set", async ({ page, api }) => {
    await newChoropleth(page, "Choropleth format");
    const pv = preview(page);
    await editorTab(page, "Format");

    await typeIn(page, "Choropleth.Editor.ValueFormat", "0,0.0");
    await expect.poll(() => legendTexts(pv)).toEqual(["41,725.0", "36,569.3", "31,413.6", "26,258.0", "21,102.3"]);
    await typeIn(page, "Choropleth.Editor.ValuePlaceholder", "none");
    await expect(byTest(page, "Choropleth.Editor.ValuePlaceholder")).toHaveValue("none");

    await expect.poll(() => legendCorner(pv)).toBe("bottom left");
    for (const [option, corner] of [
      ["TopLeft", "top left"],
      ["TopRight", "top right"],
      ["BottomRight", "bottom right"],
      ["BottomLeft", "bottom left"],
    ]) {
      await choose(page, "Choropleth.Editor.LegendPosition", `Choropleth.Editor.LegendPosition.${option}`);
      await expect.poll(() => legendCorner(pv), option).toBe(corner);
    }
    const alignment = byTest(page, "Choropleth.Editor.LegendTextAlignment").locator(".ant-radio-button-wrapper");
    await expect(alignment).toHaveCount(3);
    for (const [index, className] of [
      [1, /text-center/],
      [2, /text-right/],
      [0, /text-left/],
    ] as [number, RegExp][]) {
      await alignment.nth(index).click();
      await expect(legendItems(pv).first().locator(".legend-item-text")).toHaveClass(className);
    }
    await expect(map(pv).locator(".choropleth-visualization-legend")).toHaveCSS("font-size", "12px");
    await byTest(page, "Choropleth.Editor.LegendVisibility").click();
    await expect(legendItems(pv)).toHaveCount(0);
    await byTest(page, "Choropleth.Editor.LegendVisibility").click();
    await expect(legendItems(pv)).toHaveCount(5);

    await expect(byTest(page, "Choropleth.Editor.TooltipEnabled")).toBeChecked();
    await expect(byTest(page, "Choropleth.Editor.PopupEnabled")).toBeChecked();
    await expect(byTest(page, "Choropleth.Editor.TooltipTemplate")).toHaveValue("<b>{{ @@name }}</b>: {{ @@value }}");
    await typeIn(page, "Choropleth.Editor.TooltipTemplate", "{{ @@name }}: {{ @@value }}");
    // The template inputs share one debounced handler: see the first applied before typing the second
    const inPreview = await pointOn(pv, `path.leaflet-interactive:not([fill="${NO_VALUE}"])`, 30);
    // (a tooltip that was open while the preview was redrawn stays behind, so look for the one without bold text)
    const outside = await centerOf(byTest(page, "VisualizationName"));
    await expect(async () => {
      await hoverAt(page, outside);
      await hoverAt(page, inPreview);
      await expect(
        map(pv)
          .locator(".leaflet-tooltip")
          .filter({ hasNot: page.locator("b") })
          .filter({ hasText: /^\s*[^<]+: [\d,]+\.\d\s*$/ })
      ).toHaveCount(1, { timeout: 2000 });
    }).toPass();
    await typeIn(
      page,
      "Choropleth.Editor.PopupTemplate",
      "<b>{{ @@name_long }}</b> ({{ @@iso_a3 }})<br>Revenue {{ @@value }}, orders {{ orders }}"
    );
    await expect(async () => {
      await page.mouse.click(inPreview.x, inPreview.y);
      await expect(popup(pv)).toHaveText(/Revenue [\d,]+\.\d, orders \d+/, { timeout: 2000 });
    }).toPass();

    await parkMouse(page);

    // The Bounds tab shows the four edges of the map
    await editorTab(page, "Bounds");
    const bounds = editor(page).locator(".ant-tabs-tabpane-active .ant-input-number input");
    await expect(bounds).toHaveCount(4);
    for (const value of await bounds.evaluateAll((inputs) =>
      inputs.map((input) => (input as HTMLInputElement).value)
    )) {
      expect(Number.isFinite(Number(value)) && value !== "", `bounds value "${value}" is a number`).toBe(true);
    }

    const saved = await saveVisualization(page);
    expect((await savedVisualization(api, queryId, saved.id)).options).toMatchObject({
      valueFormat: "0,0.0",
      noValuePlaceholder: "none",
      legend: { visible: true, position: "bottom-left", alignText: "left" },
      tooltip: { enabled: true, template: "{{ @@name }}: {{ @@value }}" },
      popup: {
        enabled: true,
        template: "<b>{{ @@name_long }}</b> ({{ @@iso_a3 }})<br>Revenue {{ @@value }}, orders {{ orders }}",
      },
    });

    await openViewPage(page, queryId, saved.id);
    await expect.poll(() => legendTexts(page)).toEqual(["41,725.0", "36,569.3", "31,413.6", "26,258.0", "21,102.3"]);
    await expect.poll(() => legendCorner(page)).toBe("bottom left");
    await waitUntilStill(map(page));
    const point = await pointOn(page, `path.leaflet-interactive:not([fill="${NO_VALUE}"])`);
    const fillAt = () =>
      page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.getAttribute("fill") ?? null, point);
    const idle = await fillAt();
    await hoverAt(page, point);
    await expect(await mapTooltip(page)).toHaveText(/^\s*.+: [\d,]+\.\d\s*$/);
    await expect(await mapTooltip(page)).toHaveCSS("font-size", "12px");
    // The hovered country is drawn darker
    await expect.poll(fillAt).not.toBe(idle);
    const [, name, shown] =
      ((await (await mapTooltip(page)).textContent()) || "").trim().match(/^(.+): ([\d,.]+)$/) || [];
    const formatted = (row: Row) =>
      Number(row.revenue).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const row = rows.find((candidate) => formatted(candidate) === shown) as Row;
    expect(row, `the tooltip (${name}: ${shown}) shows the revenue of one of the countries`).toBeDefined();
    expect(String(row.country)).toContain(name.split(" ")[0]);

    await page.mouse.click(point.x, point.y);
    await expect(popup(page)).toHaveCount(1);
    expect((await popup(page).innerHTML()).trim()).toMatch(
      new RegExp(`^<b>[^<]+</b> \\([A-Z]{3}\\)<br>Revenue ${shown.replace(".", "\\.")}, orders ${row.orders}$`)
    );
    // Clicking elsewhere on the map closes the popup
    const box = await map(page).boundingBox();
    await page.mouse.click((box?.x ?? 0) + (box?.width ?? 0) / 2, (box?.y ?? 0) + (box?.height ?? 0) - 12);
    await expect(popup(page)).toHaveCount(0);
  });

  test.describe("when the window is resized", () => {
    const SMALL = { width: 1100, height: 760 };
    const LARGE = { width: 1440, height: 900 };

    /** Resizes the window and waits until the map has its new size. */
    async function resize(page: Page, size: { width: number; height: number }, from: Snapshot) {
      await page.setViewportSize(size);
      await expect.poll(async () => (await snapshot(page)).box).not.toEqual(from.box);
      // The map reacts to its new size a moment later; whether it keeps the view is what the tests check
      await page.waitForTimeout(1500);
    }

    test("an untouched map is fitted to the new size", async ({ page, api }) => {
      await openSaved(page, api);
      const initial = await snapshot(page);
      await page.setViewportSize(SMALL);
      await expect.poll(async () => change(initial, await snapshot(page)).scale).toBeLessThan(0.9);
      const small = await snapshot(page);
      expect(change(initial, small).dx).toBe(0);
      expect(small.box[0]).toBeLessThan(initial.box[0]);
      await page.setViewportSize(LARGE);
      await expect.poll(async () => change(initial, await snapshot(page))).toEqual({ scale: 1, dx: 0 });
    });

    test("a view zoomed with the + button is kept", async ({ page, api }) => {
      await openSaved(page, api);
      const initial = await snapshot(page);
      await map(page).locator(".leaflet-control-zoom-in").click();
      await expect.poll(async () => change(initial, await snapshot(page)).scale).toBe(2);
      const zoomed = await snapshot(page);

      await resize(page, SMALL, zoomed);
      expect(change(zoomed, await snapshot(page))).toEqual({ scale: 1, dx: 0 });
      await resize(page, LARGE, await snapshot(page));
      expect(change(zoomed, await snapshot(page))).toEqual({ scale: 1, dx: 0 });
      expect(change(initial, await snapshot(page)).scale).toBe(2);
    });

    test("a view zoomed with a double click and then dragged is kept", async ({ page, api }) => {
      await openSaved(page, api);
      const initial = await snapshot(page);
      const center = await centerOf(map(page));
      await page.mouse.dblclick(center.x - 100, center.y - 60);
      await expect.poll(async () => change(initial, await snapshot(page)).scale).toBe(2);
      await dragTo(page, center, { x: center.x + 120, y: center.y + 40 });
      const moved = await snapshot(page);

      await resize(page, SMALL, moved);
      expect(change(moved, await snapshot(page))).toEqual({ scale: 1, dx: 0 });
      await resize(page, LARGE, await snapshot(page));
      expect(change(moved, await snapshot(page))).toEqual({ scale: 1, dx: 0 });
    });

    test("a view that was only dragged is kept", async ({ page, api }) => {
      knownIssue("choropleth-pan-lost-on-resize");
      await openSaved(page, api);
      const initial = await snapshot(page);
      const center = await centerOf(map(page));
      await dragTo(page, center, { x: center.x + 160, y: center.y });
      const dragged = await snapshot(page);
      expect(change(initial, dragged).scale).toBe(1);
      expect(change(initial, dragged).dx).toBeGreaterThan(140);

      await resize(page, SMALL, dragged);
      expect(change(dragged, await snapshot(page))).toEqual({ scale: 1, dx: 0 });
      await resize(page, LARGE, await snapshot(page));
      expect(change(dragged, await snapshot(page))).toEqual({ scale: 1, dx: 0 });
    });
  });

  test("the mouse wheel does not zoom and the fullscreen button fills the screen", async ({ page, api }) => {
    await openSaved(page, api);
    const initial = await snapshot(page);
    await hoverAt(page, await centerOf(map(page)));
    await page.mouse.wheel(0, -400);
    await page.mouse.wheel(0, -400);
    await page.waitForTimeout(800); // a wheel zoom would have started by now
    expect(change(initial, await snapshot(page))).toEqual({ scale: 1, dx: 0 });

    const isFullscreen = () => page.evaluate(() => document.fullscreenElement?.className ?? null);
    expect(await isFullscreen()).toBeNull();
    await map(page).locator(".leaflet-control-fullscreen-button, .leaflet-control-zoom-fullscreen").first().click();
    await expect.poll(isFullscreen).toMatch(/leaflet-container/);
    await expect.poll(async () => (await snapshot(page)).box).toEqual([1440, 900]);
    expect(new URL(page.url()).pathname).toBe(`/queries/${queryId}`);

    // (Escape does not leave fullscreen in a headless browser; the button does)
    await map(page).locator(".leaflet-control-fullscreen-button, .leaflet-control-zoom-fullscreen").first().click();
    await expect.poll(isFullscreen).toBeNull();
    await expect.poll(async () => (await snapshot(page)).box).toEqual(initial.box);
  });

  test("the USA and Japan maps are drawn", async ({ page, api, seed }) => {
    const usaQuery = await seedQuery(api, seed.dataSources.postgres, uniqueName("V choropleth usa"), USA_SQL);
    await openSourcePage(page, usaQuery);
    await newVisualization(page, "CHOROPLETH", "Choropleth USA");
    const pv = preview(page);
    await expect(shapes(pv)).toHaveCount(176);

    await choose(page, "Choropleth.Editor.MapType", "Choropleth.Editor.MapType.usa");
    await expect(shapes(pv)).toHaveCount(52);
    await choose(page, "Choropleth.Editor.KeyColumn", "Choropleth.Editor.KeyColumn.state");
    expect(await optionTexts(page, "Choropleth.Editor.TargetField")).toEqual([
      "Name",
      "National Standard ANSI Code (8-character)",
      "Geographic ID",
      "USPS Abbreviation",
      "FIPS Code (2-character)",
    ]);
    await choose(page, "Choropleth.Editor.TargetField", "Choropleth.Editor.TargetField.usps_abbrev");
    await choose(page, "Choropleth.Editor.ValueColumn", "Choropleth.Editor.ValueColumn.value");
    await expect.poll(() => legendTexts(pv)).toEqual(["150.00", "120.00", "90.00", "60.00", "30.00"]);
    // 7 states have a value
    expect((await fills(pv))[NO_VALUE]).toBe(45);
    expect((await classes(pv)).sort()).toEqual([1, 1, 1, 2, 2]);

    // Japan: 47 prefectures drawn, none of them matches the data
    await choose(page, "Choropleth.Editor.MapType", "Choropleth.Editor.MapType.subdiv_japan");
    await expect(shapes(pv)).toHaveCount(48);
    await expect.poll(() => fills(pv)).toEqual({ [NO_VALUE]: 48 });

    await choose(page, "Choropleth.Editor.MapType", "Choropleth.Editor.MapType.usa");
    await expect(shapes(pv)).toHaveCount(52);
    await choose(page, "Choropleth.Editor.KeyColumn", "Choropleth.Editor.KeyColumn.state");
    await choose(page, "Choropleth.Editor.TargetField", "Choropleth.Editor.TargetField.usps_abbrev");
    await choose(page, "Choropleth.Editor.ValueColumn", "Choropleth.Editor.ValueColumn.value");
    await expect.poll(async () => (await fills(pv))[NO_VALUE]).toBe(45);
    const saved = await saveVisualization(page);
    expect((await savedVisualization(api, usaQuery, saved.id)).options).toMatchObject({
      mapType: "usa",
      keyColumn: "state",
      targetField: "usps_abbrev",
      valueColumn: "value",
    });

    await openViewPage(page, usaQuery, saved.id);
    await expect.poll(() => legendTexts(page)).toEqual(["150.00", "120.00", "90.00", "60.00", "30.00"]);
    await expect.poll(async () => (await fills(page))[NO_VALUE]).toBe(45);
    const states: Record<string, string> = {
      California: "120.00",
      Texas: "90.00",
      "New York": "150.00",
      Florida: "60.00",
      Washington: "30.00",
      Alaska: "45.00",
      Hawaii: "75.00",
    };
    await waitUntilStill(map(page));
    await hoverAt(page, await pointOn(page, `path.leaflet-interactive:not([fill="${NO_VALUE}"])`));
    await expect(await mapTooltip(page)).toHaveText(/^\s*.+: [\d.]+\s*$/);
    const [, state, value] =
      ((await (await mapTooltip(page)).textContent()) || "").trim().match(/^(.+): ([\d.]+)$/) || [];
    expect(states[state], `tooltip of ${state}`).toBe(value);
    await expect((await mapTooltip(page)).locator("b")).toHaveText(state);
  });
});
