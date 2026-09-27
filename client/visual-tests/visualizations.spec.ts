import { expect, test } from "@playwright/test";
import { DASHBOARDS, EXAMPLES, VisualizationType } from "./examples";
import { readManifest } from "./manifest";

// Map tiles come from third-party servers; serve a plain light gray tile instead so maps are deterministic.
const MAP_TILE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGN48eIFAAV0ArnZwsdlAAAAAElFTkSuQmCC",
  "base64"
);
const MAP_TILE_URL = /tile\.(openstreetmap|opentopomap)\.org\//;

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

test.beforeEach(async ({ page }) => {
  // Word cloud (and anything else randomized) should lay out the same way on every run
  await page.addInitScript(() => {
    let seed = 42;
    Math.random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  });
  await page.route(MAP_TILE_URL, (route) => route.fulfill({ body: MAP_TILE, contentType: "image/png" }));
});

for (const [type, dashboardName] of Object.entries(DASHBOARDS) as [VisualizationType, string][]) {
  const visualizations = EXAMPLES.flatMap((example) => example.visualizations).filter((viz) => viz.type === type);

  test(dashboardName, async ({ page }) => {
    const dashboard = readManifest().dashboards[type];
    if (!dashboard) {
      throw new Error(`No ${type} dashboard in the manifest`);
    }

    await page.goto(dashboard.publicPath);
    await page.waitForLoadState("networkidle");

    for (const viz of visualizations) {
      const widget = page.locator(`[data-widgetid="${dashboard.widgets[viz.name]}"]`);
      await widget.scrollIntoViewIfNeeded();
      await expect.soft(widget, viz.name).toHaveScreenshot([slugify(dashboardName), `${slugify(viz.name)}.png`]);
    }
  });
}
