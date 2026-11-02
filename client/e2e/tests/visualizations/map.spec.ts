import type { Locator, Page } from "@playwright/test";
import { expect, test, uniqueName } from "../../support/fixtures";
import { knownIssue } from "../../support/known-issues";
import { byTest, centerOf, createVisualizationViaApi } from "../../support/ui";
import {
  choose,
  dragTo,
  editorTab,
  editVisualization,
  hoverAt,
  leaflet,
  mapTooltip,
  markersInView,
  nameVisualization,
  newVisualization,
  openSourcePage,
  openViewPage,
  optionTexts,
  parkMouse,
  pickColor,
  pointOn,
  preview,
  type Row,
  resultRows,
  savedVisualization,
  saveVisualization,
  seedQuery,
  stubMapTiles,
  tileZoom,
  typeIn,
  visualizationTab,
  waitUntilStill,
  SLOW_INSTANCE_TIMEOUT,
} from "./helpers";

// The editor tests make many round trips; on a loaded server they need more than the default 90 seconds
test.describe.configure({ timeout: SLOW_INSTANCE_TIMEOUT });

// The 12 cities with their number of orders and revenue; `zone` splits them into north and south
const SQL = `select c.name, c.country, c.lat, c.lon, case when c.lat > 30 then 'north' else 'south' end as zone,
  count(o.id) as orders, round(sum(o.amount)) as revenue
from cities c join orders o on o.city_id = c.id group by 1, 2, 3, 4, 5 order by 1`;

const MARKER = ".leaflet-marker-pane > :not(.marker-cluster)";
const markers = (scope: Page | Locator) => leaflet(scope).locator(MARKER);
const circles = (scope: Page | Locator) => leaflet(scope).locator("path.leaflet-interactive");
const popup = (scope: Page | Locator) => leaflet(scope).locator(".leaflet-popup-content");
// At the zoom that shows all 12 cities, five of them are close enough to be drawn as two clusters
const WORLD_VIEW = { icons: 7, circles: 0, clusters: ["2", "3"] };

/** Offset of the map's pane: how far the map was dragged since it was last drawn. */
function paneOffset(page: Page): Promise<{ x: number; y: number }> {
  return leaflet(page)
    .locator(".leaflet-map-pane")
    .evaluate((pane) => {
      const [x, y] = ((pane as HTMLElement).style.transform.match(/-?[\d.]+px/g) || ["0", "0"]).map(parseFloat);
      return { x, y };
    });
}

test.describe("Map (Markers) visualization", () => {
  let queryId: number;
  let rows: Row[];
  let tiles: string[];

  test.beforeEach(async ({ api, seed, page }) => {
    tiles = await stubMapTiles(page);
    queryId = await seedQuery(api, seed.dataSources.postgres, uniqueName("V map"), SQL);
    rows = await resultRows(api, queryId);
    expect(rows).toHaveLength(12);
  });

  /** A saved map with default options, opened on the query page. */
  async function openSavedMap(
    page: Page,
    api: Parameters<typeof createVisualizationViaApi>[0],
    options: Record<string, unknown> = {}
  ) {
    const id = await createVisualizationViaApi(api, queryId, {
      type: "MAP",
      name: "Map",
      options: { latColName: "lat", lonColName: "lon", ...options },
    });
    await openViewPage(page, queryId, id);
    await expect(leaflet(page)).toBeVisible();
    await expect.poll(() => tileZoom(page)).toBe(2);
    await waitUntilStill(leaflet(page));
    return id;
  }

  test("the editor sets the coordinate columns, clustering and the tile set", async ({ page, api }) => {
    await openSourcePage(page, queryId);
    await newVisualization(page, "MAP", "Map A");
    const pv = preview(page);
    await choose(page, "Map.Editor.LatitudeColumnName", "Map.Editor.LatitudeColumnName.lat");
    await choose(page, "Map.Editor.LongitudeColumnName", "Map.Editor.LongitudeColumnName.lon");
    await expect.poll(() => markersInView(pv)).toEqual(WORLD_VIEW);
    await expect.poll(() => tileZoom(pv)).toBe(2);
    expect(tiles.every((url) => /\.tile\.openstreetmap\.org\//.test(url))).toBe(true);

    await editorTab(page, "Style");
    expect(await optionTexts(page, "Map.Editor.Tiles")).toEqual(
      expect.arrayContaining([
        "OpenStreetMap",
        "OpenStreetMap BW",
        "OpenStreetMap DE",
        "OpenStreetMap FR",
        "OpenStreetMap Hot",
        "Thunderforest",
        "Thunderforest Spinal",
      ])
    );
    await expect(byTest(page, "Map.Editor.ClusterMarkers")).toBeChecked();
    await byTest(page, "Map.Editor.ClusterMarkers").click();
    await expect.poll(() => markersInView(pv)).toEqual({ icons: 12, circles: 0, clusters: [] });
    await byTest(page, "Map.Editor.ClusterMarkers").click();
    await expect.poll(() => markersInView(pv)).toEqual(WORLD_VIEW);

    // Another tile set: the tiles now come from its server
    await choose(page, "Map.Editor.Tiles", "Map.Editor.Tiles.OpenStreetMap DE");
    await expect
      .poll(() =>
        leaflet(pv)
          .locator("img.leaflet-tile")
          .evaluateAll((images) =>
            images.every((image) => (image as HTMLImageElement).src.includes("openstreetmap.de"))
          )
      )
      .toBe(true);
    await expect(leaflet(pv).locator("img.leaflet-tile").first()).toBeVisible();

    const saved = await saveVisualization(page);
    expect((await savedVisualization(api, queryId, saved.id)).options).toMatchObject({
      latColName: "lat",
      lonColName: "lon",
      clusterMarkers: true,
      mapTileUrl: "//{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png",
    });

    await openViewPage(page, queryId, saved.id);
    await expect.poll(() => markersInView(page)).toEqual(WORLD_VIEW);
    await expect
      .poll(() =>
        leaflet(page)
          .locator("img.leaflet-tile")
          .evaluateAll(
            (images) =>
              images.length > 0 &&
              images.every(
                (image) =>
                  (image as HTMLImageElement).src.includes("openstreetmap.de/tiles/osmde/2/") &&
                  (image as HTMLImageElement).complete &&
                  (image as HTMLImageElement).naturalWidth > 0
              )
          )
      )
      .toBe(true);
  });

  test("markers can be given a shape, an icon and colours", async ({ page, api }) => {
    await openSourcePage(page, queryId);
    await newVisualization(page, "MAP", "Map markers");
    const pv = preview(page);
    await expect.poll(() => markersInView(pv)).toEqual(WORLD_VIEW);
    await expect(markers(pv).first()).toHaveJSProperty("tagName", "IMG");

    await editorTab(page, "Style");
    await byTest(page, "Map.Editor.CustomizeMarkers").click();
    for (const shape of ["doughnut", "circle-dot", "circle", "rectangle-dot", "rectangle"]) {
      await choose(page, "Map.Editor.MarkerShape", `Map.Editor.MarkerShape.${shape}`);
      await expect(leaflet(pv).locator(`.leaflet-marker-pane > .beautify-marker.${shape}`), shape).toHaveCount(7);
    }
    await choose(page, "Map.Editor.MarkerShape", "Map.Editor.MarkerShape.marker");
    const pin = leaflet(pv).locator(".leaflet-marker-pane > .beautify-marker > .beautify-marker.marker");
    await expect(pin).toHaveCount(7);

    await typeIn(page, "Map.Editor.MarkerIcon", "star");
    await expect(pin.first().locator("i.fa.fa-star")).toHaveCount(1);
    await pickColor(page, "Map.Editor.MarkerIconColor", "FFFF00");
    await expect(pin.first()).toHaveCSS("color", "rgb(255, 255, 0)");
    await pickColor(page, "Map.Editor.MarkerBackgroundColor", "8E44AD");
    await expect(pin.first()).toHaveCSS("background-color", "rgb(142, 68, 173)");
    await pickColor(page, "Map.Editor.MarkerBorderColor", "000000");
    await expect(pin.first()).toHaveCSS("border-top-color", "rgb(0, 0, 0)");

    const saved = await saveVisualization(page);
    expect((await savedVisualization(api, queryId, saved.id)).options).toMatchObject({
      customizeMarkers: true,
      iconShape: "marker",
      iconFont: "star",
      foregroundColor: "#FFFF00",
      backgroundColor: "#8E44AD",
      borderColor: "#000000",
    });

    await openViewPage(page, queryId, saved.id);
    const onPage = leaflet(page).locator(".leaflet-marker-pane > .beautify-marker > .beautify-marker.marker");
    await expect(onPage).toHaveCount(7);
    await expect(onPage.first()).toHaveCSS("background-color", "rgb(142, 68, 173)");
    await expect(onPage.first().locator("i.fa-star")).toHaveCSS("color", "rgb(255, 255, 0)");
  });

  test("group by draws coloured circles per group with a layers control", async ({ page, api }) => {
    const south = rows.filter((row) => row.zone === "south").length;
    const north = rows.length - south;
    expect(south).toBeGreaterThan(0);
    expect(north).toBeGreaterThan(0);
    const id = await openSavedMap(page, api, { clusterMarkers: false });
    await expect(markers(page)).toHaveCount(12);

    await editVisualization(page);
    const pv = preview(page);
    await choose(page, "Map.Editor.GroupBy", "Map.Editor.GroupBy.zone");
    await expect(circles(pv)).toHaveCount(12);
    await expect(markers(pv)).toHaveCount(0);
    await expect(leaflet(pv).locator(".leaflet-control-layers-overlays label")).toHaveText([/north/, /south/]);
    const fills = (scope: Page | Locator) =>
      circles(scope).evaluateAll((paths) => {
        const count: Record<string, number> = {};
        for (const path of paths) {
          const fill = path.getAttribute("fill") || "";
          count[fill] = (count[fill] || 0) + 1;
        }
        return count;
      });
    const before = await fills(pv);
    expect(Object.values(before).sort()).toEqual([north, south].sort());

    await editorTab(page, "Groups");
    await pickColor(page, "Map.Editor.Groups.south.Color", "FF0000");
    const northColor = Object.keys(before).find((color) => before[color] === north && color !== "#FF0000") as string;
    await expect.poll(() => fills(pv)).toEqual({ [northColor]: north, "#FF0000": south });

    // One style for all markers makes no sense with groups: the option is disabled
    await editorTab(page, "Style");
    await expect(byTest(page, "Map.Editor.CustomizeMarkers")).toBeDisabled();

    await nameVisualization(page, "Map grouped");
    await saveVisualization(page);
    const stored = await savedVisualization(api, queryId, id);
    expect(stored.name).toBe("Map grouped");
    expect(stored.options.classify).toBe("zone");
    expect(stored.options.groups.south.color).toBe("#FF0000");
    await expect(visualizationTab(page, id)).toHaveText("Map grouped");
    await expect.poll(() => fills(page)).toEqual({ [northColor]: north, "#FF0000": south });

    // The layers control opens on hover; unticking a group removes its markers
    const control = leaflet(page).locator(".leaflet-control-layers");
    await hoverAt(page, await centerOf(control));
    const southBox = control
      .locator(".leaflet-control-layers-overlays label")
      .filter({ hasText: "south" })
      .locator("input");
    await expect(southBox).toBeVisible();
    await southBox.click();
    await expect.poll(() => fills(page)).toEqual({ [northColor]: north });
    await southBox.click();
    await expect.poll(() => fills(page)).toEqual({ [northColor]: north, "#FF0000": south });
  });

  test("tooltip and popup templates are filled with the row of the marker", async ({ page, api }) => {
    await openSourcePage(page, queryId);
    await newVisualization(page, "MAP", "Map templates");
    await editorTab(page, "Format");
    const pv = preview(page);
    await byTest(page, "Map.Editor.TooltipEnabled").click();
    await typeIn(page, "Map.Editor.TooltipTemplate", "{{name}}: {{orders}} orders");
    // The two template inputs share one debounced handler: typing the second right away would drop the first.
    // So see the first applied (hover a marker of the preview) before typing the second.
    const inPreview = await pointOn(pv, MARKER, 20);
    await expect(async () => {
      await hoverAt(page, { x: inPreview.x - 80, y: inPreview.y - 80 });
      await hoverAt(page, inPreview);
      await expect(
        leaflet(pv)
          .locator(".leaflet-tooltip")
          .filter({ hasText: /^\s*.+: \d+ orders\s*$/ })
      ).toHaveCount(1, { timeout: 2000 });
    }).toPass();
    await expect(byTest(page, "Map.Editor.PopupEnabled")).toBeChecked();
    await typeIn(page, "Map.Editor.PopupTemplate", "<b>{{name}}</b>, {{country}}<br>Revenue: {{revenue}}");
    await expect(async () => {
      await page.mouse.click(inPreview.x, inPreview.y);
      await expect(popup(pv)).toHaveText(/^\s*.+, .+Revenue: \d+\s*$/, { timeout: 2000 });
    }).toPass();
    await expect(popup(pv).locator("b")).toHaveCount(1);
    await parkMouse(page);

    const saved = await saveVisualization(page);
    expect((await savedVisualization(api, queryId, saved.id)).options).toMatchObject({
      tooltip: { enabled: true, template: "{{name}}: {{orders}} orders" },
      popup: { enabled: true, template: "<b>{{name}}</b>, {{country}}<br>Revenue: {{revenue}}" },
    });

    await openViewPage(page, queryId, saved.id);
    await expect.poll(() => markersInView(page)).toEqual(WORLD_VIEW);
    await waitUntilStill(leaflet(page));
    const point = await pointOn(page, MARKER);
    await hoverAt(page, point);
    await expect(await mapTooltip(page)).toHaveText(/^\s*.+: \d+ orders\s*$/);
    await expect(await mapTooltip(page)).toHaveCSS("font-size", "12px");
    const city = ((await (await mapTooltip(page)).textContent()) || "").split(":")[0].trim();
    const row = rows.find((candidate) => candidate.name === city) as Row;
    expect(row, `the tooltip names one of the cities (${city})`).toBeDefined();
    await expect(await mapTooltip(page)).toHaveText(`${row.name}: ${row.orders} orders`);

    await page.mouse.click(point.x, point.y);
    await expect(popup(page)).toHaveCount(1);
    // Rendered as HTML, not as text
    await expect(popup(page).locator("b")).toHaveText(String(row.name));
    await expect(popup(page)).toHaveText(`${row.name}, ${row.country}Revenue: ${row.revenue}`);
    expect((await popup(page).innerHTML()).trim()).toBe(
      `<b>${row.name}</b>, ${row.country}<br>Revenue: ${row.revenue}`
    );

    // Clicking the map closes the popup
    const box = await leaflet(page).boundingBox();
    await page.mouse.click((box?.x ?? 0) + 300, (box?.y ?? 0) + (box?.height ?? 0) - 60);
    await expect(popup(page)).toHaveCount(0);
  });

  test("the x of a popup closes it and stays on the page", async ({ page, api }) => {
    knownIssue("map-popup-close-navigates");
    await openSavedMap(page, api);
    const point = await pointOn(page, MARKER);
    await page.mouse.click(point.x, point.y);
    await expect(popup(page)).toHaveCount(1);

    await hoverAt(page, await centerOf(leaflet(page).locator(".leaflet-popup-close-button")));
    await page.mouse.down();
    await page.mouse.up();
    await expect(popup(page)).toHaveCount(0);
    await expect(leaflet(page)).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(`/queries/${queryId}`);
  });

  test("the zoom buttons zoom, the mouse wheel does not", async ({ page, api }) => {
    await openSavedMap(page, api);
    await leaflet(page).locator(".leaflet-control-zoom-in").click();
    await expect.poll(() => tileZoom(page)).toBe(3);
    await leaflet(page).locator(".leaflet-control-zoom-in").click();
    await expect.poll(() => tileZoom(page)).toBe(4);
    await leaflet(page).locator(".leaflet-control-zoom-out").click();
    await expect.poll(() => tileZoom(page)).toBe(3);
    await leaflet(page).locator(".leaflet-control-zoom-out").click();
    await expect.poll(() => tileZoom(page)).toBe(2);
    await expect.poll(() => markersInView(page)).toEqual(WORLD_VIEW);

    // The wheel is left to the page (`scrollWheelZoom: false`): the map does not zoom
    const requested = tiles.length;
    await hoverAt(page, await centerOf(leaflet(page)));
    await page.mouse.wheel(0, -400);
    await page.mouse.wheel(0, -400);
    await page.waitForTimeout(800); // a wheel zoom would have started by now
    expect(await tileZoom(page)).toBe(2);
    expect(tiles.length, "no tiles of another zoom level were requested").toBe(requested);
    expect(await markersInView(page)).toEqual(WORLD_VIEW);
  });

  test("a double click zooms in and dragging pans the map", async ({ page, api }) => {
    await openSavedMap(page, api);
    const center = await centerOf(leaflet(page));
    await page.mouse.dblclick(center.x + 30, center.y + 30);
    await expect.poll(() => tileZoom(page)).toBe(3);

    await expect.poll(() => paneOffset(page)).toEqual({ x: 0, y: 0 });
    const marker = markers(page).first();
    const before = await marker.boundingBox();
    await dragTo(page, center, { x: center.x - 220, y: center.y + 90 });
    await expect.poll(async () => Math.round((await paneOffset(page)).x)).toBeLessThan(-200);
    const offset = await paneOffset(page);
    expect(Math.abs(offset.x + 218)).toBeLessThan(6);
    expect(Math.abs(offset.y - 92)).toBeLessThan(6);
    const after = await marker.boundingBox();
    expect(Math.round((after?.x ?? 0) - (before?.x ?? 0))).toBe(Math.round(offset.x));
    expect(Math.round((after?.y ?? 0) - (before?.y ?? 0))).toBe(Math.round(offset.y));
    expect(await tileZoom(page)).toBe(3);
  });

  test("clicking a cluster zooms in and splits it into its markers", async ({ page, api }) => {
    await openSavedMap(page, api);
    await expect.poll(() => markersInView(page)).toEqual(WORLD_VIEW);
    const cluster = leaflet(page)
      .locator(".marker-cluster")
      .filter({ hasText: /^\s*2\s*$/ });
    const point = await centerOf(cluster);
    await hoverAt(page, point);
    await page.mouse.click(point.x, point.y);

    await expect.poll(() => tileZoom(page)).toBeGreaterThan(2);
    await expect(cluster).toHaveCount(0);
    await expect.poll(async () => (await markersInView(page)).icons).toBeGreaterThanOrEqual(2);
  });

  test("the attribution and the map's texts are 12px", async ({ page, api }) => {
    await openSavedMap(page, api);
    const attribution = leaflet(page).locator(".leaflet-control-attribution");
    await expect(attribution).toHaveText(/^\s*Leaflet \| © OpenStreetMap contributors\s*$/);
    await expect(attribution).toHaveCSS("font-size", "12px");
    await expect(attribution.locator("svg")).toHaveCount(1);
    await expect(leaflet(page)).toHaveCSS("font-size", "12px");
    await expect(leaflet(page).locator(".leaflet-control-layers")).toHaveCSS("font-size", "12px");
    // The flag is a small inline icon, not a full-size image
    const flag = await attribution.locator("svg").boundingBox();
    expect(flag?.width).toBeLessThan(20);
    expect(flag?.height).toBeLessThan(12);
  });
});
