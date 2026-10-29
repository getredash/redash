import { expect, test } from "../../support/fixtures";
import { byTest } from "../../support/ui";
import {
  addTextboxViaApi,
  boxes,
  Created,
  createDashboardViaApi,
  doneEditingButton,
  grid,
  openDashboard,
  stableBoxes,
} from "./helpers";

/**
 * The grid switches to one column when it is 800 px wide or narrower (`mobileBreakPoint` in
 * `app/config/dashboard-grid-options.js`). On a desktop-sized window the 80 px side menu sits beside the grid, so
 * that is a window of 880 px; the Cypress suite used `800 + menuWidth` for the same reason. Measured: windows of
 * 768 px and wider have the side menu (the grid is the window width minus 80).
 */
const MENU_WIDTH = 80;
const AT_BREAKPOINT = { width: 800 + MENU_WIDTH, height: 800 };
const JUST_ABOVE = { width: 801 + MENU_WIDTH, height: 800 };

test.describe("Dashboard at the single column breakpoint", () => {
  const created = new Created();
  test.afterAll(async ({ api }) => {
    await created.archiveAll(api);
  });

  async function dashboardWithTextbox(api: Parameters<typeof createDashboardViaApi>[0]) {
    const dashboard = await createDashboardViaApi(api, created, "D Breakpoint");
    const id = await addTextboxViaApi(api, dashboard.id, "Hello World!", { col: 0, row: 0, sizeX: 3, sizeY: 3 });
    return { dashboardId: dashboard.id, id };
  }

  test("widgets have the full width up to the breakpoint and the grid layout just above it", async ({ page, api }) => {
    const { dashboardId, id } = await dashboardWithTextbox(api);
    await page.setViewportSize(AT_BREAKPOINT);
    await openDashboard(page, dashboardId);

    // 800 px grid: one column with a 15 px margin on each side
    expect((await grid(page).boundingBox())?.width).toBe(800);
    await expect.poll(async () => (await boxes(page))[id]?.w).toBe(800 - 2 * 15);

    // 801 px grid: 12 columns of (801 - 13 * 15) / 12 = 50.5 px; 3 of them and two margins make 182 px
    await page.setViewportSize(JUST_ABOVE);
    await expect.poll(async () => (await boxes(page))[id]?.w).toBe(182);
    expect((await grid(page).boundingBox())?.width).toBe(801);
  });

  test("Edit is offered in the menu just above the breakpoint and not at it", async ({ page, api }) => {
    const { dashboardId } = await dashboardWithTextbox(api);
    // The window is narrowed after the page loaded, like the Cypress test did
    await page.setViewportSize(JUST_ABOVE);
    await openDashboard(page, dashboardId);
    await byTest(page, "DashboardMoreButton").click();
    const menu = byTest(page, "DashboardMoreButtonMenu");
    const edit = menu.getByText("Edit", { exact: true });
    await expect(edit).toBeVisible();
    await page.keyboard.press("Escape");

    await page.setViewportSize(AT_BREAKPOINT);
    await expect.poll(async () => (await grid(page).boundingBox())?.width).toBe(800);
    await byTest(page, "DashboardMoreButton").click();
    await expect(menu.getByText("Archive")).toBeVisible();
    await expect(edit).toBeHidden();

    await page.setViewportSize(JUST_ABOVE);
    await expect(edit).toBeVisible();
  });

  test("a dashboard in edit mode leaves edit mode when the window gets down to the breakpoint", async ({
    page,
    api,
  }) => {
    const { dashboardId, id } = await dashboardWithTextbox(api);
    await page.setViewportSize(JUST_ABOVE);
    await openDashboard(page, dashboardId, "?edit");
    await expect(doneEditingButton(page)).toBeVisible();
    await expect(page.locator(".dashboard-wrapper.editing-mode")).toBeVisible();

    await page.setViewportSize(AT_BREAKPOINT);
    await expect(doneEditingButton(page)).toHaveCount(0);
    await expect(page.locator(".dashboard-wrapper.preview-mode")).toBeVisible();
    await expect(byTest(page, "DashboardMoreButton")).toBeVisible();
    expect((await stableBoxes(page))[id].w).toBe(800 - 2 * 15);
  });
});
