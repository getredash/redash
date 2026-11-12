import type { Dialog, Page } from "@playwright/test";
import { DATA_SOURCES } from "../../support/env";
import { expect, test, uniqueName } from "../../support/fixtures";
import { byTest, createQueryViaApi, dismissToasts, getSql, renameQuery, retype, setSql, toast } from "../../support/ui";
import { editor, headerMenu, MOD, openNewQuery, openQuerySource, saveButton } from "./helpers";

const title = (page: Page) => page.locator(".query-page-header h3");
const description = (page: Page) => page.locator(".query-page-query-description");
// Filtered by text: a new query opens on the CSV data source, whose schema error toast may be up as well
const savedToast = (page: Page) => toast(page).filter({ hasText: "Query saved" });
const queriesLink = (page: Page) => page.locator('.desktop-navbar a[href="queries"], nav a[href="queries"]').first();

test.describe("Saving a query", () => {
  test("Save stores a new query, and Cmd/Ctrl+S stores a later edit", async ({ page, api }) => {
    await openNewQuery(page, DATA_SOURCES.postgres);
    await setSql(page, "select id, name, country from cities order by id");
    await expect(saveButton(page)).toHaveText(/Save\s*\*/);

    await saveButton(page).click();
    await expect(page).toHaveURL(/\/queries\/\d+\/source/);
    await expect(savedToast(page)).toBeVisible();
    await expect(saveButton(page)).toHaveText(/^\s*Save\s*$/);
    const id = Number(page.url().match(/\/queries\/(\d+)/)?.[1]);
    try {
      const saved = await api.get(`/api/queries/${id}`);
      expect(saved.query).toBe("select id, name, country from cities order by id");
      expect(saved.is_draft).toBe(true);
      await dismissToasts(page);
      await expect(savedToast(page)).toHaveCount(0);

      await setSql(page, "select id, name, country, lat, lon from cities order by id");
      await expect(saveButton(page)).toHaveText(/Save\s*\*/);
      await page.keyboard.press(`${MOD}+s`);
      await expect(savedToast(page)).toBeVisible();
      await expect(saveButton(page)).toHaveText(/^\s*Save\s*$/);
      expect((await api.get(`/api/queries/${id}`)).query).toBe(
        "select id, name, country, lat, lon from cities order by id"
      );
    } finally {
      await api.delete(`/api/queries/${id}`);
    }
  });

  test("renaming a new query by its title saves and publishes it", async ({ page, api }) => {
    await openNewQuery(page, DATA_SOURCES.postgres);
    await setSql(page, "select 1 as one");
    await saveButton(page).click();
    await expect(page).toHaveURL(/\/queries\/\d+\/source/);
    const id = Number(page.url().match(/\/queries\/(\d+)/)?.[1]);
    try {
      await expect(title(page)).toHaveText("New Query");
      await dismissToasts(page);

      const name = uniqueName("Q renamed");
      await renameQuery(page, name);
      await expect(title(page)).toHaveText(name);
      await expect(page).toHaveTitle(new RegExp(name));
      await expect(toast(page).filter({ hasText: "Query saved and published" })).toBeVisible();
      await expect(page.locator(".query-tags .label-tag-unpublished")).toHaveCount(0);
      const saved = await api.get(`/api/queries/${id}`);
      expect(saved.name).toBe(name);
      expect(saved.is_draft).toBe(false);

      // The queries list shows it under the new name
      await page.goto(`/queries?q=${encodeURIComponent(name)}`);
      await expect(page.locator("tbody tr").filter({ hasText: name })).toHaveCount(1);
    } finally {
      await api.delete(`/api/queries/${id}`);
    }
  });

  test("the description is added and edited in place", async ({ page, api, seed }) => {
    const query = await createQueryViaApi(api, {
      name: uniqueName("Q description"),
      dataSourceId: seed.dataSources.postgres,
      sql: "select 1 as one",
      run: false,
    });
    await openQuerySource(page, query.id);

    await description(page).locator(".edit-in-place a.clickable").click();
    await expect(description(page).locator("textarea")).toBeFocused();
    await page.keyboard.type("First description with **bold** text");
    // Clicking elsewhere saves it
    await title(page)
      .locator("xpath=ancestor::div[contains(@class,'page-title')]")
      .click({ position: { x: 5, y: 2 } });
    await expect
      .poll(async () => (await api.get(`/api/queries/${query.id}`)).description)
      .toBe("First description with **bold** text");
    await expect(description(page).locator("textarea")).toHaveCount(0);
    await expect(description(page)).toContainText("First description with **bold** text");

    await description(page).locator(".edit-in-place .editable").click();
    await expect(description(page).locator("textarea")).toBeFocused();
    await retype(page, "Edited description");
    await page.keyboard.press("Enter");
    await expect.poll(async () => (await api.get(`/api/queries/${query.id}`)).description).toBe("Edited description");
    await expect(description(page)).toContainText("Edited description");

    await page.reload();
    await expect(description(page)).toContainText("Edited description");
  });

  test("Unpublish and Publish switch the query between draft and published", async ({ page, api, seed }) => {
    const query = await createQueryViaApi(api, {
      name: uniqueName("Q publish"),
      dataSourceId: seed.dataSources.postgres,
      sql: "select 1 as one",
      run: false,
    });
    await openQuerySource(page, query.id);
    const unpublishedLabel = page.locator(".query-tags .label-tag-unpublished");
    const publishButton = page.locator(".query-page-header .header-actions button").filter({ hasText: "Publish" });
    await expect(unpublishedLabel).toHaveCount(0);
    await expect(publishButton).toHaveCount(0);

    await headerMenu(page, "Unpublish");
    await expect(unpublishedLabel).toHaveText("Unpublished");
    await expect(publishButton).toBeVisible();
    await expect.poll(async () => (await api.get(`/api/queries/${query.id}`)).is_draft).toBe(true);

    await publishButton.click();
    await expect(unpublishedLabel).toHaveCount(0);
    await expect(publishButton).toHaveCount(0);
    await expect.poll(async () => (await api.get(`/api/queries/${query.id}`)).is_draft).toBe(false);
  });
});

test.describe("Leaving a query with unsaved changes", () => {
  const SAVED_SQL = "select id, name from cities order by id";
  let queryId: number;

  test.beforeAll(async ({ api, seed }) => {
    queryId = (
      await createQueryViaApi(api, {
        name: uniqueName("Q unsaved"),
        dataSourceId: seed.dataSources.postgres,
        sql: SAVED_SQL,
        run: false,
      })
    ).id;
  });

  /** Records the browser dialogs and answers them. */
  function answerDialogs(page: Page, answer: { accept: boolean }) {
    const dialogs: { type: string; message: string }[] = [];
    page.on("dialog", async (dialog: Dialog) => {
      dialogs.push({ type: dialog.type(), message: dialog.message() });
      await (answer.accept ? dialog.accept() : dialog.dismiss());
    });
    return dialogs;
  }

  test("navigating away asks for confirmation; Cancel stays and keeps the edit", async ({ page }) => {
    const dialogs = answerDialogs(page, { accept: false });
    await openQuerySource(page, queryId);
    await setSql(page, "select id, name from cities -- unsaved edit");
    await expect(saveButton(page)).toHaveText(/Save\s*\*/);

    await queriesLink(page).click();
    await expect.poll(() => dialogs).toHaveLength(1);
    expect(dialogs[0].type).toBe("confirm");
    expect(dialogs[0].message).toContain("You will lose your changes if you leave");
    expect(dialogs[0].message).toContain("Are you sure you want to leave this page?");
    await expect(page).toHaveURL(new RegExp(`/queries/${queryId}/source`));
    expect(await getSql(page)).toBe("select id, name from cities -- unsaved edit");
  });

  test("OK leaves the page and the edit is discarded", async ({ page, api }) => {
    const dialogs = answerDialogs(page, { accept: true });
    await openQuerySource(page, queryId);
    await setSql(page, "select id, name from cities -- unsaved edit");

    await queriesLink(page).click();
    await expect(page).toHaveURL(/\/queries(\?|$)/);
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0].type).toBe("confirm");
    expect((await api.get(`/api/queries/${queryId}`)).query).toBe(SAVED_SQL);
  });

  test("there is no prompt when nothing was changed", async ({ page }) => {
    const dialogs = answerDialogs(page, { accept: false });
    await openQuerySource(page, queryId);
    await expect.poll(() => getSql(page)).toBe(SAVED_SQL);
    await queriesLink(page).click();
    await expect(page).toHaveURL(/\/queries(\?|$)/);
    await expect(byTest(page, "QueryEditor")).toHaveCount(0);
    expect(dialogs).toEqual([]);
  });

  test("reloading the browser with unsaved changes raises the browser's own prompt", async ({ page }) => {
    const dialogs = answerDialogs(page, { accept: true });
    await openQuerySource(page, queryId);
    await setSql(page, "select 1 -- unsaved");
    await page.reload();
    await editor(page).waitFor();
    expect(dialogs.map((dialog) => dialog.type)).toEqual(["beforeunload"]);
    await expect.poll(() => getSql(page)).toBe(SAVED_SQL);
  });
});
