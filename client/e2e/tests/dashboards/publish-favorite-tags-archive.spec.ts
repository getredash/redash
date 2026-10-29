import type { Page } from "@playwright/test";
import { expect, test, uniqueName } from "../../support/fixtures";
import { knownIssue } from "../../support/known-issues";
import { byTest } from "../../support/ui";
import {
  Created,
  confirmButton,
  confirmDialog,
  createDashboardViaApi,
  dashboardTitle,
  fullscreenButton,
  getDashboard,
  publishButton,
} from "./helpers";

const header = (page: Page) => page.locator(".dashboard-header");
const tagLabels = (page: Page) => byTest(header(page), "TagLabel");
const unpublishedLabel = (page: Page) => header(page).locator(".label", { hasText: "Unpublished" });
const tagsDialog = (page: Page) => byTest(page, "EditTagsDialog");

async function open(page: Page, id: number) {
  await page.goto(`/dashboards/${id}`);
  await expect(dashboardTitle(page)).toBeVisible();
}

/** Opens the tag dialog, removes and adds tags, and saves. */
async function editTags(page: Page, change: { add?: string[]; remove?: string[] }) {
  await byTest(header(page), "EditTagsButton").click();
  const dialog = tagsDialog(page);
  // The field is disabled until the existing tags have loaded
  await expect(dialog.locator(".ant-select")).toBeVisible();
  await expect(dialog.locator(".ant-select")).not.toHaveClass(/ant-select-disabled/);
  for (const tag of change.remove || []) {
    await dialog
      .locator(".ant-select-selection-item")
      .filter({ hasText: tag })
      .locator(".ant-select-selection-item-remove")
      .click();
  }
  if (change.add?.length) {
    const input = dialog.locator("input.ant-select-selection-search-input");
    for (const tag of change.add) {
      await input.fill(tag);
      await expect(input).toHaveValue(tag);
      await input.press("Enter");
      await expect(dialog.locator(".ant-select-selection-item").filter({ hasText: tag })).toBeVisible();
    }
    // Close the suggestions, which cover the Save button
    await dialog.locator(".ant-modal-title").click();
  }
  await dialog.locator(".ant-modal-footer button.ant-btn-primary").click();
  await expect(dialog).toBeHidden();
}

test.describe("Publishing, favourites, tags and archiving", () => {
  const created = new Created();
  test.afterAll(async ({ api }) => {
    await created.archiveAll(api);
  });

  test("a draft shows the Unpublished label and a Publish button, but no share or fullscreen buttons", async ({
    page,
    api,
  }) => {
    const dashboard = await createDashboardViaApi(api, created, "D Draft");
    await open(page, dashboard.id);
    await expect(unpublishedLabel(page)).toBeVisible();
    await expect(publishButton(page)).toBeVisible();
    await expect(fullscreenButton(page)).toHaveCount(0);
    await expect(byTest(page, "OpenShareForm")).toHaveCount(0);
  });

  test("Publish removes the Unpublished label and shows the share and fullscreen buttons", async ({ page, api }) => {
    const dashboard = await createDashboardViaApi(api, created, "D Publish");
    await open(page, dashboard.id);
    await publishButton(page).click();
    await expect(unpublishedLabel(page)).toHaveCount(0);
    await expect(publishButton(page)).toHaveCount(0);
    await expect(fullscreenButton(page)).toBeVisible();
    await expect(byTest(page, "OpenShareForm")).toBeVisible();
    await expect.poll(async () => (await getDashboard(api, dashboard.id)).is_draft).toBe(false);

    await page.reload();
    await expect(dashboardTitle(page)).toBeVisible();
    await expect(unpublishedLabel(page)).toHaveCount(0);
    await expect(byTest(page, "OpenShareForm")).toBeVisible();
  });

  test("Unpublish in the menu makes the dashboard a draft again", async ({ page, api }) => {
    const dashboard = await createDashboardViaApi(api, created, "D Unpublish", { publish: true });
    await open(page, dashboard.id);
    await expect(unpublishedLabel(page)).toHaveCount(0);

    await byTest(page, "DashboardMoreButton").click();
    const menu = byTest(page, "DashboardMoreButtonMenu");
    await expect(menu.locator(".ant-dropdown-menu-item")).toHaveText([
      "Edit",
      /^Fork\s*\(opens in a new tab\)$/,
      "Unpublish",
      "Archive",
    ]);
    await menu.getByText("Unpublish").click();
    await expect(unpublishedLabel(page)).toBeVisible();
    await expect(publishButton(page)).toBeVisible();
    await expect(fullscreenButton(page)).toHaveCount(0);
    await expect(byTest(page, "OpenShareForm")).toHaveCount(0);
    await expect.poll(async () => (await getDashboard(api, dashboard.id)).is_draft).toBe(true);

    // A draft has no Unpublish entry
    await byTest(page, "DashboardMoreButton").click();
    await expect(menu.getByText("Archive")).toBeVisible();
    await expect(menu.getByText("Unpublish")).toHaveCount(0);
  });

  test("the star adds the dashboard to the favourites and removes it again", async ({ page, api }) => {
    const dashboard = await createDashboardViaApi(api, created, "D Favourite", { publish: true });
    await open(page, dashboard.id);
    const star = header(page).locator(".favorites-control");
    await expect(star.locator("i")).toHaveClass("fa fa-star-o");

    await star.click();
    await expect(star.locator("i")).toHaveClass("fa fa-star");
    await expect(star).toHaveAttribute("title", "Remove from favorites");
    expect((await getDashboard(api, dashboard.id)).is_favorite).toBe(true);

    await star.click();
    await expect(star.locator("i")).toHaveClass("fa fa-star-o");
    await expect(star).toHaveAttribute("title", "Add to favorites");
    expect((await getDashboard(api, dashboard.id)).is_favorite).toBe(false);

    await star.click();
    await expect(star.locator("i")).toHaveClass("fa fa-star");
    expect((await getDashboard(api, dashboard.id)).is_favorite).toBe(true);
    await page.reload();
    await expect(star.locator("i")).toHaveClass("fa fa-star");
  });

  test("tags are added and removed in the tag dialog", async ({ page, api }) => {
    const dashboard = await createDashboardViaApi(api, created, "D Tags");
    const [one, two] = [uniqueName("d-tag-one").replace(/ /g, "-"), uniqueName("d-tag-two").replace(/ /g, "-")];
    await open(page, dashboard.id);
    await expect(tagLabels(page)).toHaveCount(0);

    await editTags(page, { add: [one, two] });
    await expect(tagLabels(page)).toHaveText([one, two]);
    await expect.poll(async () => (await getDashboard(api, dashboard.id)).tags).toEqual([one, two]);

    await editTags(page, { remove: [two] });
    await expect(tagLabels(page)).toHaveText([one]);
    await expect.poll(async () => (await getDashboard(api, dashboard.id)).tags).toEqual([one]);

    await page.reload();
    await expect(tagLabels(page)).toHaveText([one]);
  });

  test("a tag added right after Publish, without reloading, is saved", async ({ page, api }) => {
    knownIssue("tag-after-publish-conflict");
    const dashboard = await createDashboardViaApi(api, created, "D Tag after publish");
    const tag = uniqueName("d-tag-three").replace(/ /g, "-");
    await open(page, dashboard.id);
    await publishButton(page).click();
    await expect(unpublishedLabel(page)).toHaveCount(0);
    await expect.poll(async () => (await getDashboard(api, dashboard.id)).is_draft).toBe(false);

    await editTags(page, { add: [tag] });
    await expect(tagLabels(page)).toHaveText([tag]);
    await expect.poll(async () => (await getDashboard(api, dashboard.id)).tags, { timeout: 5_000 }).toEqual([tag]);
  });

  test("Archive asks for confirmation and marks the dashboard as archived", async ({ page, api }) => {
    const dashboard = await createDashboardViaApi(api, created, "D Spare To Archive");
    await open(page, dashboard.id);

    await byTest(page, "DashboardMoreButton").click();
    await byTest(page, "DashboardMoreButtonMenu").getByText("Archive").click();
    await expect(confirmDialog(page).locator(".ant-modal-confirm-title")).toHaveText("Archive Dashboard");
    await expect(confirmDialog(page).locator(".ant-modal-confirm-content")).toHaveText(
      `Are you sure you want to archive the "${dashboard.name}" dashboard?`
    );
    // Cancel leaves it alone
    await confirmDialog(page).getByRole("button", { name: "Cancel" }).click();
    await expect(confirmDialog(page)).toBeHidden();
    expect((await getDashboard(api, dashboard.id)).is_archived).toBe(false);

    await byTest(page, "DashboardMoreButton").click();
    await byTest(page, "DashboardMoreButtonMenu").getByText("Archive").click();
    await expect(confirmButton(page)).toHaveText("Archive");
    await confirmButton(page).click();
    await expect(header(page).locator(".label", { hasText: "Archived" })).toBeVisible();
    await expect(header(page).getByRole("button", { name: "Unarchive" })).toBeVisible();
    await expect(byTest(page, "DashboardMoreButton")).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`/dashboards/${dashboard.id}`));
    await expect.poll(async () => (await getDashboard(api, dashboard.id)).is_archived).toBe(true);

    // It is gone from the list, and still opens by its address
    await page.goto(`/dashboards?q=${encodeURIComponent(dashboard.name)}`);
    await expect(page.getByText("Sorry, we couldn't find anything.")).toBeVisible();
    await expect(byTest(page, `DashboardId${dashboard.id}`)).toHaveCount(0);
    await open(page, dashboard.id);
    await expect(dashboardTitle(page)).toHaveText(dashboard.name);
    await expect(header(page).locator(".label", { hasText: "Archived" })).toBeVisible();
  });
});
