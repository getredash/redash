import type { Page } from "@playwright/test";
import { DATA_SOURCES } from "../../support/env";
import { expect, test, uniqueName } from "../../support/fixtures";
import { byTest, createQueryViaApi, getSql, selectOptions } from "../../support/ui";
import { editor, headerMenu, openQuerySource, run } from "./helpers";

const SQL = "select category, sum(amount) as revenue from orders group by 1 order by 1";
const tagLabels = (page: Page) => page.locator('.query-tags [data-test="TagLabel"]');
const listRows = (page: Page) => page.locator("tbody tr");
const suffix = () => uniqueName("x").slice(2);

test.describe("Fork and archive", () => {
  test("Fork opens an unpublished copy in a new tab", async ({ page, context, api, seed }) => {
    const name = uniqueName("Q fork base");
    const tag = `q-fork-${suffix()}`;
    const base = await createQueryViaApi(api, {
      name,
      dataSourceId: seed.dataSources.postgres,
      sql: SQL,
      tags: [tag],
    });
    await openQuerySource(page, base.id);

    const newTab = context.waitForEvent("page");
    await headerMenu(page, "Fork");
    const fork = await newTab;
    await expect(fork).toHaveURL(/\/queries\/\d+\/source/, { timeout: 30_000 });
    const forkId = Number(fork.url().match(/\/queries\/(\d+)/)?.[1]);
    try {
      expect(forkId).not.toBe(base.id);
      await editor(fork).waitFor();
      await expect(fork.locator(".query-page-header h3")).toHaveText(`Copy of (#${base.id}) ${name}`);
      await expect(fork.locator(".query-tags .label-tag-unpublished")).toHaveText("Unpublished");
      await expect(tagLabels(fork)).toHaveText([tag]);
      await expect(byTest(fork, "SelectDataSource")).toContainText(DATA_SOURCES.postgres);
      await expect.poll(() => getSql(fork)).toBe(SQL);

      const saved = await api.get(`/api/queries/${forkId}`);
      expect(saved).toMatchObject({
        name: `Copy of (#${base.id}) ${name}`,
        is_draft: true,
        tags: [tag],
        query: SQL,
        data_source_id: seed.dataSources.postgres,
      });

      const { result, error } = await run(fork);
      expect(error).toBeNull();
      expect(result?.data.rows.map((row) => row.category)).toEqual(["Hardware", "Services", "Software", "Training"]);

      // The original is untouched
      expect(await api.get(`/api/queries/${base.id}`)).toMatchObject({ name, is_draft: false, is_archived: false });
    } finally {
      await api.delete(`/api/queries/${forkId}`);
    }
  });

  test("Archive asks for confirmation and moves the query to the archive list", async ({ page, api, seed }) => {
    const prefix = uniqueName("Q archive");
    const kept = await createQueryViaApi(api, {
      name: `${prefix} kept`,
      dataSourceId: seed.dataSources.postgres,
      sql: "select 1 as one",
      run: false,
    });
    const archived = await createQueryViaApi(api, {
      name: `${prefix} gone`,
      dataSourceId: seed.dataSources.postgres,
      sql: "select 2 as two",
      run: false,
    });
    await openQuerySource(page, archived.id);

    await headerMenu(page, "Archive");
    const confirm = page.locator(".ant-modal-confirm");
    await expect(confirm).toContainText("Archive Query");
    await expect(confirm).toContainText("Are you sure you want to archive this query?");
    await confirm.locator(".ant-modal-confirm-btns .ant-btn").filter({ hasText: "Archive" }).click();

    await expect(page.locator(".query-tags .label-tag-archived")).toHaveText("Archived");
    await expect.poll(async () => (await api.get(`/api/queries/${archived.id}`)).is_archived).toBe(true);
    expect((await api.get(`/api/queries/${kept.id}`)).is_archived).toBe(false);
    // An archived query cannot be archived again
    await byTest(page, "QueryPageHeaderMoreButton").click();
    await expect(page.locator(".ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu-item").first()).toBeVisible();
    await expect(
      page.locator(".ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu-item").filter({ hasText: "Archive" })
    ).toHaveCount(0);
    await page.keyboard.press("Escape");

    // "All Queries" no longer lists it; "Archived" does
    await page.goto("/queries");
    await page.getByPlaceholder("Search Queries...").fill(prefix);
    await expect(listRows(page).filter({ hasText: `${prefix} kept` })).toHaveCount(1);
    await expect(listRows(page).filter({ hasText: prefix })).toHaveCount(1);

    await page.goto("/queries/archive");
    await page.getByPlaceholder("Search Queries...").fill(prefix);
    await expect(listRows(page).filter({ hasText: `${prefix} gone` })).toHaveCount(1);
    await expect(listRows(page).filter({ hasText: prefix })).toHaveCount(1);
  });
});

test.describe("Tags", () => {
  const dialog = (page: Page) => byTest(page, "EditTagsDialog");
  const chosen = (page: Page) => dialog(page).locator(".ant-select-selection-item-content");
  const ok = (page: Page) => dialog(page).locator(".ant-modal-footer .ant-btn-primary");

  /** Closes the suggestions list (it covers the buttons) by clicking the dialog title. */
  const closeSuggestions = (page: Page) => dialog(page).locator(".ant-modal-title").click();

  test("tags are added, removed and discarded through the tags dialog, and filter the queries list", async ({
    page,
    api,
    seed,
    guard,
  }) => {
    const name = uniqueName("Q tags");
    const sfx = suffix();
    const [alpha, beta, gamma] = [`q-alpha-${sfx}`, `q-beta-${sfx}`, `q-gamma-${sfx}`];
    const query = await createQueryViaApi(api, {
      name,
      dataSourceId: seed.dataSources.postgres,
      sql: SQL,
      run: false,
    });
    await openQuerySource(page, query.id);

    // Add two new tags
    await byTest(page, "EditTagsButton").click();
    await expect(dialog(page).locator(".ant-select input")).toBeFocused();
    await page.keyboard.type(alpha);
    await page.keyboard.press("Enter");
    await page.keyboard.type(beta);
    await page.keyboard.press("Enter");
    await expect(chosen(page)).toHaveText([alpha, beta]);
    await closeSuggestions(page);
    await ok(page).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(tagLabels(page)).toHaveText([alpha, beta]);
    await expect.poll(async () => (await api.get(`/api/queries/${query.id}`)).tags).toEqual([alpha, beta]);

    // Reopen: both are preloaded; remove one with its x, add a third
    await byTest(page, "EditTagsButton").click();
    await expect(chosen(page)).toHaveText([alpha, beta]);
    await dialog(page)
      .locator(".ant-select-selection-item")
      .filter({ hasText: alpha })
      .locator(".ant-select-selection-item-remove")
      .click();
    await expect(chosen(page)).toHaveText([beta]);
    await dialog(page).locator(".ant-select-selector").click();
    // Existing tags are offered while typing
    await page.keyboard.type(alpha.slice(0, -1));
    await expect(selectOptions(page).filter({ hasText: alpha })).toHaveCount(1);
    await retypeTag(page, alpha.slice(0, -1).length, gamma);
    await page.keyboard.press("Enter");
    await expect(chosen(page)).toHaveText([beta, gamma]);
    await closeSuggestions(page);
    await ok(page).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(tagLabels(page)).toHaveText([beta, gamma]);
    await expect.poll(async () => (await api.get(`/api/queries/${query.id}`)).tags).toEqual([beta, gamma]);

    // Cancel discards
    await byTest(page, "EditTagsButton").click();
    await expect(chosen(page)).toHaveText([beta, gamma]);
    await expect(dialog(page).locator(".ant-select input")).toBeFocused();
    await page.keyboard.type(`q-discard-${sfx}`);
    await page.keyboard.press("Enter");
    await expect(chosen(page)).toHaveCount(3);
    await closeSuggestions(page);
    await dialog(page).locator(".ant-modal-footer .ant-btn").filter({ hasText: "Cancel" }).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(tagLabels(page)).toHaveText([beta, gamma]);
    expect((await api.get(`/api/queries/${query.id}`)).tags).toEqual([beta, gamma]);

    // The tag is in the sidebar of the queries list with its count, and filters the list
    await page.goto("/queries");
    const sidebarTag = page.locator(".tags-list .ant-menu-item").filter({ hasText: beta });
    await expect(sidebarTag).toHaveText(new RegExp(`${beta}\\s*1$`));
    await sidebarTag.click();
    await expect(listRows(page)).toHaveCount(1);
    await expect(listRows(page)).toContainText(name);

    // No React "Maximum update depth exceeded" error from the dialog
    expect(guard.consoleErrors.filter((error) => /Maximum update depth/.test(error))).toEqual([]);
  });

  async function retypeTag(page: Page, typed: number, tag: string) {
    for (let i = 0; i < typed; i += 1) {
      await page.keyboard.press("Backspace");
    }
    await page.keyboard.type(tag);
  }
});

test.describe("Favorites", () => {
  test("the star adds the query to the favorites lists and removes it again", async ({ page, api, seed }) => {
    const name = uniqueName("Q favorite");
    const query = await createQueryViaApi(api, {
      name,
      dataSourceId: seed.dataSources.postgres,
      sql: "select 1 as one",
      run: false,
    });
    await openQuerySource(page, query.id);
    const star = page.locator(".query-page-header .favorites-control");
    await expect(star.locator("i")).toHaveClass("fa fa-star-o");
    await expect(star).toHaveAttribute("title", "Add to favorites");

    await star.click();
    await expect(star.locator("i")).toHaveClass("fa fa-star");
    await expect(star).toHaveAttribute("title", "Remove from favorites");
    await expect.poll(async () => (await api.get(`/api/queries/${query.id}`)).is_favorite).toBe(true);

    await page.goto("/");
    const homeFavorites = page.locator(".home-favorites-list > div").filter({ hasText: "Favorite Queries" });
    await expect(homeFavorites.getByText(name)).toBeVisible();

    await page.goto("/queries/favorites");
    await page.getByPlaceholder("Search Queries...").fill(name);
    await expect(listRows(page).filter({ hasText: name })).toHaveCount(1);

    await openQuerySource(page, query.id);
    await expect(star.locator("i")).toHaveClass("fa fa-star");
    await star.click();
    await expect(star.locator("i")).toHaveClass("fa fa-star-o");
    await expect.poll(async () => (await api.get(`/api/queries/${query.id}`)).is_favorite).toBe(false);

    await page.goto("/queries/favorites");
    await expect(page.getByPlaceholder("Search Queries...")).toBeVisible();
    await page.getByPlaceholder("Search Queries...").fill(name);
    // The list has reloaded for the search term, and the query is not in it
    await expect(page).toHaveURL(/q=/);
    await expect(page.locator(".ant-spin-spinning")).toHaveCount(0);
    await expect(listRows(page).filter({ hasText: name })).toHaveCount(0);
    await page.goto("/");
    await expect(page.locator(".home-favorites-list")).toContainText("Favorite Queries");
    await expect(page.locator(".home-favorites-list").getByText(name)).toHaveCount(0);
  });
});
