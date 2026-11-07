import type { Page } from "@playwright/test";
import { DATA_SOURCES } from "../../support/env";
import { expect, test } from "../../support/fixtures";
import { byTest, createQueryViaApi } from "../../support/ui";
import {
  byLowerCase,
  createDashboardViaApi,
  expectNames,
  listNames,
  listRows,
  menuItem,
  removeUser,
  searchFor,
  setPageSize,
  sortBy,
  uniqueToken,
} from "./helpers";

const orderOf = (page: Page) => new URL(page.url()).searchParams.get("order");

test.describe("Dashboards list", () => {
  const token = uniqueToken("adl");
  const tagFinance = `${token}-finance`;
  const tagMarketing = `${token}-marketing`;
  // Created in this order; "a ... lowercase" shows that names sort case-insensitively
  const names = [
    `A ${token} dash Operations`,
    `A ${token} dash Finance`,
    `a ${token} dash lowercase draft`,
    `A ${token} dash Marketing`,
    `A ${token} dash Zeta`,
    `A ${token} dash Budget`,
    `A ${token} dash Sales`,
  ];
  const ids: number[] = [];
  const BOX = "Search Dashboards...";

  test.beforeAll(async ({ api }) => {
    for (const [index, name] of names.entries()) {
      const tags = index === 1 ? [tagFinance] : index === 3 ? [tagFinance, tagMarketing] : [];
      ids.push((await createDashboardViaApi(api, name, [], { tags, draft: index === 2 })).id);
    }
    await api.post(`/api/dashboards/${ids[0]}/favorite`);
    await api.post(`/api/dashboards/${ids[4]}/favorite`);
  });
  test.afterAll(async ({ api }) => {
    for (const id of ids) {
      await api.delete(`/api/dashboards/${id}`).catch(() => undefined);
    }
  });

  test("sorts by name (ignoring letter case) and by creation time, in both directions", async ({ page }) => {
    const byName = [...names].sort(byLowerCase);
    await page.goto(`/dashboards?q=${token}`);
    await expect(listRows(page)).toHaveCount(7);

    await sortBy(page, "Name");
    await expect.poll(() => orderOf(page)).toBe("name");
    await expectNames(page, byName, { ordered: true });
    expect(byName.indexOf(names[2])).toBe(2); // Finance, then "a ... lowercase draft", then Marketing
    await sortBy(page, "Name");
    await expect.poll(() => orderOf(page)).toBe("-name");
    await expectNames(page, [...byName].reverse(), { ordered: true });

    await sortBy(page, "Created At");
    await expect.poll(() => orderOf(page)).toBe("created_at");
    await expectNames(page, names, { ordered: true });
    await sortBy(page, "Created At");
    await expect.poll(() => orderOf(page)).toBe("-created_at");
    await expectNames(page, [...names].reverse(), { ordered: true });

    const headers = await page
      .locator("thead th")
      .evaluateAll((cells) =>
        cells.map((th) => [(th.textContent || "").trim(), th.classList.contains("ant-table-column-has-sorters")])
      );
    expect(headers.filter(([title]) => title)).toEqual([
      ["Name", true],
      ["Created By", false],
      ["Created At", true],
    ]);
  });

  test("pages of five show every dashboard exactly once", async ({ page }) => {
    const byName = [...names].sort(byLowerCase);
    await page.goto(`/dashboards?q=${token}&order=name`);
    await expectNames(page, byName, { ordered: true });
    await setPageSize(page, 5);
    await expectNames(page, byName.slice(0, 5), { ordered: true });
    await expect(page.locator(".ant-pagination-item")).toHaveCount(2);
    await page.locator("li.ant-pagination-next").click();
    await expectNames(page, byName.slice(5), { ordered: true });
    await page.locator("li.ant-pagination-prev").click();
    await expectNames(page, byName.slice(0, 5), { ordered: true });
  });

  test("My Dashboards and Favorites list the right dashboards; drafts are labelled", async ({ page }) => {
    await page.goto(`/dashboards?q=${token}`);
    await expectNames(page, names);
    const draft = listRows(page).filter({ hasText: names[2] });
    await expect(draft.locator(".label-tag-unpublished")).toHaveText("Unpublished");
    await expect(page.locator(".label-tag-unpublished")).toHaveCount(1);

    await menuItem(page, "My Dashboards").click();
    await expect(page).toHaveURL(/\/dashboards\/my/);
    await searchFor(page, BOX, token);
    await expectNames(page, names);

    await menuItem(page, "Favorites").click();
    await expect(page).toHaveURL(/\/dashboards\/favorites/);
    await searchFor(page, BOX, token);
    await expectNames(page, [names[0], names[4]]);
    await expect(page.locator("thead th", { hasText: "Starred At" })).toBeVisible();
  });

  test("the tags sidebar filters by one tag and, with Shift, by two", async ({ page }) => {
    const tag = (name: string) => page.locator(".tags-list .ant-menu-item").filter({ hasText: name });
    await page.goto(`/dashboards?q=${token}`);
    await expect(listRows(page)).toHaveCount(7);
    await tag(tagFinance).click();
    await expectNames(page, [names[1], names[3]]);
    await page.keyboard.down("Shift");
    await tag(tagMarketing).click();
    await page.keyboard.up("Shift");
    await expectNames(page, [names[3]]);
    await page.locator(".tags-list").getByText("clear selection").first().click();
    await expect(listRows(page)).toHaveCount(7);
  });
});

test.describe("Users list", () => {
  const token = uniqueToken("aul");
  // The names sort case-SENSITIVELY in this list: "A ... alpha", "A ... zed", "a ... mid"
  const active = [
    { name: `A ${token} alpha`, id: 0, email: "" },
    { name: `a ${token} mid`, id: 0, email: "" },
    { name: `A ${token} zed`, id: 0, email: "" },
  ];
  const pending: { name: string; id: number; email: string }[] = [];
  const disabled = { name: `A ${token} disabled`, id: 0, email: "" };
  let groupId = 0;
  const BOX = "Search...";

  /** Which of this test's users the rows show, in the order shown. */
  const shownUsers = async (page: Page) => {
    const all = [...active, ...pending, disabled];
    const rows = await listRows(page).allInnerTexts();
    return rows.map((text) => all.find((user) => text.includes(user.email))?.name || `? ${text}`);
  };

  test.beforeAll(async ({ api }) => {
    const group = await api.post("/api/groups", { name: `A ${token} group` });
    groupId = group.id;
    const make = async (name: string, groupIds?: number[]) => {
      const email = `${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${Math.floor(Math.random() * 1e6)}@example.com`;
      const user = await api.post("/api/users?no_invite", { name, email });
      await api.acceptInvite(user.invite_link, "e2e-throwaway-1");
      if (groupIds) {
        await api.post(`/api/users/${user.id}`, { group_ids: groupIds });
      }
      return { id: user.id as number, email, groups: user.groups as number[] };
    };
    // Created in this order (the Joined column); in groups [default], [default, own group], [own group]
    const first = await make(active[0].name);
    const defaultGroupId = first.groups[0];
    Object.assign(active[0], first);
    Object.assign(active[1], await make(active[1].name, [defaultGroupId, groupId]));
    Object.assign(active[2], await make(active[2].name, [groupId]));
    Object.assign(disabled, await make(disabled.name));
    await api.post(`/api/users/${disabled.id}/disable`);
    for (const name of [`A ${token} pending one`, `A ${token} pending two`]) {
      const email = `${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}@example.com`;
      const user = await api.post("/api/users", { name, email });
      pending.push({ name, id: user.id, email });
    }
  });

  test.afterAll(async ({ api }) => {
    for (const user of [...active, ...pending, disabled]) {
      if (user.id) {
        await removeUser(api, user.id);
      }
    }
    await api.delete(`/api/groups/${groupId}`).catch(() => undefined);
  });

  test("the Active, Pending and Disabled tabs each show the right users", async ({ page }) => {
    await page.goto("/users");
    await searchFor(page, BOX, token);
    await expect(listRows(page)).toHaveCount(3);
    expect((await shownUsers(page)).sort()).toEqual(active.map((u) => u.name).sort());

    await menuItem(page, /Pending Invitations/).click();
    await expect(page).toHaveURL(/\/users\/pending/);
    await searchFor(page, BOX, token);
    await expect(listRows(page)).toHaveCount(2);
    expect((await shownUsers(page)).sort()).toEqual(pending.map((u) => u.name).sort());
    await expect(listRows(page).first().getByRole("button", { name: "Delete" })).toBeVisible();

    await menuItem(page, /Disabled Users/).click();
    await expect(page).toHaveURL(/\/users\/disabled/);
    await searchFor(page, BOX, token);
    await expect(listRows(page)).toHaveCount(1);
    expect(await shownUsers(page)).toEqual([disabled.name]);
    await expect(listRows(page).getByRole("button", { name: "Enable" })).toBeVisible();
  });

  test("search finds users by name and by a piece of the email address, in any letter case", async ({ page }) => {
    await page.goto("/users");
    await searchFor(page, BOX, `${token} zed`);
    await expect(listRows(page)).toHaveCount(1);
    expect(await shownUsers(page)).toEqual([active[2].name]);

    await searchFor(page, BOX, `${token.toUpperCase()} ALPHA`);
    await expect(listRows(page)).toHaveCount(1);
    expect(await shownUsers(page)).toEqual([active[0].name]);

    // A fragment from the middle of the address
    const fragment = active[1].email.slice(2, active[1].email.indexOf("@") + 4);
    await searchFor(page, BOX, fragment);
    await expect(listRows(page)).toHaveCount(1);
    expect(await shownUsers(page)).toEqual([active[1].name]);

    await searchFor(page, BOX, `${token} zzznobody`);
    await expect(listRows(page)).toHaveCount(0);
    await expect(page.getByText(/Sorry, we couldn.t find anything/)).toBeVisible();
  });

  test("sorts by name (case-sensitively), by groups and by the time the user joined", async ({ page }) => {
    const byName = [active[0].name, active[2].name, active[1].name]; // upper-case "A" before lower-case "a"
    const byJoined = active.map((u) => u.name);
    const byGroups = active.map((u) => u.name); // [default] < [default, own] < [own]: by the group ids
    await page.goto("/users");
    await searchFor(page, BOX, token);
    await expect(listRows(page)).toHaveCount(3);

    const check = async (column: string, field: string, ascending: string[]) => {
      await sortBy(page, column);
      await expect.poll(() => orderOf(page)).toMatch(new RegExp(`^-?${field}$`));
      const first = orderOf(page);
      await expect.poll(() => shownUsers(page)).toEqual(first === field ? ascending : [...ascending].reverse());
      await sortBy(page, column);
      await expect.poll(() => orderOf(page)).toBe(first === field ? `-${field}` : field);
      await expect.poll(() => shownUsers(page)).toEqual(first === field ? [...ascending].reverse() : ascending);
    };
    await check("Name", "name", byName);
    await check("Joined", "created_at", byJoined);
    await check("Groups", "groups", byGroups);
  });

  test("sorting by Last Active At shows the users in the order the API gives for it", async ({ page, api }) => {
    // When a user was last active is recorded with a delay, so the expected order is read from the API
    await page.goto("/users");
    await searchFor(page, BOX, token);
    await expect(listRows(page)).toHaveCount(3);
    for (const order of ["active_at", "-active_at"]) {
      await sortBy(page, "Last Active At");
      await expect.poll(() => orderOf(page)).toBe(order);
      const expected: { name: string }[] = (await api.get("/api/users", { q: token, order, pending: "false" })).results;
      await expect.poll(() => shownUsers(page)).toEqual(expected.map((u) => u.name));
    }
  });
});

test.describe("Alerts list", () => {
  const token = uniqueToken("aal");
  const alerts = [
    { name: `A ${token} alert Bravo`, id: 0 },
    { name: `a ${token} alert alpha lowercase`, id: 0 },
    { name: `A ${token} alert Charlie`, id: 0 },
  ];
  let queryId = 0;

  /** Names of this test's alerts in the order shown, collected over all pages of the (client-side) list. */
  const shownAlerts = async (page: Page): Promise<string[]> => {
    const found: string[] = [];
    const first = page.locator(".ant-pagination-item-1:not(.ant-pagination-item-active)");
    if ((await first.count()) > 0) {
      await first.click();
    }
    for (let pages = 0; pages < 50; pages += 1) {
      found.push(...(await listNames(page)).filter((name) => name.includes(token)));
      const next = page.locator("li.ant-pagination-next:not(.ant-pagination-disabled)");
      if ((await next.count()) === 0) {
        break;
      }
      await next.click();
    }
    return found;
  };

  test.beforeAll(async ({ api, seed }) => {
    queryId = (
      await createQueryViaApi(api, {
        name: `A ${token} alert query`,
        dataSourceId: seed.dataSources.postgres,
        sql: "select 1 as a",
      })
    ).id;
    // Created in this order: Bravo (a > 0), alpha (a > 5), Charlie (a > 0)
    for (const [index, alert] of alerts.entries()) {
      const created = await api.post("/api/alerts", {
        name: alert.name,
        query_id: queryId,
        options: { column: "a", op: ">", value: index === 1 ? 5 : 0 },
      });
      alert.id = created.id;
    }
  });
  test.afterAll(async ({ api }) => {
    for (const alert of alerts) {
      await api.delete(`/api/alerts/${alert.id}`).catch(() => undefined);
    }
    await api.delete(`/api/queries/${queryId}`).catch(() => undefined);
  });

  test("has no search box; a click on a column sorts ascending, a second click descending, without changing the URL", async ({
    page,
  }) => {
    const created = alerts.map((a) => a.name);
    // This list sorts in the browser, case-sensitively: upper-case "A ..." names before the lower-case one
    const byName = [alerts[0].name, alerts[2].name, alerts[1].name];
    await page.goto("/alerts");
    await expect(listRows(page).first()).toBeVisible();
    await expect(page.getByPlaceholder(/Search/)).toHaveCount(0);
    // Newest first by default
    await expect.poll(() => shownAlerts(page)).toEqual([...created].reverse());

    // (the rows are re-sorted a moment after the header shows the new direction)
    const expectSorted = async (column: string, direction: "ascending" | "descending", expected: string[]) => {
      await sortBy(page, column);
      await expect(page.locator("thead th", { hasText: column })).toHaveAttribute("aria-sort", direction);
      await expect.poll(() => shownAlerts(page), `alerts sorted by ${column}, ${direction}`).toEqual(expected);
    };
    await expectSorted("Name", "ascending", byName);
    await expectSorted("Name", "descending", [...byName].reverse());
    await expectSorted("Created At", "ascending", created);
    await expectSorted("Created At", "descending", [...created].reverse());
    await expect(page).toHaveURL(/\/alerts$/);

    for (const column of ["State", "Last Updated At"]) {
      await expect(page.locator("thead th.ant-table-column-has-sorters", { hasText: column })).toBeVisible();
    }
    await expect(page.locator("thead th", { hasText: "Created By" })).not.toHaveClass(/ant-table-column-has-sorters/);
  });

  test("the name opens the alert", async ({ page }) => {
    await page.goto("/alerts");
    await expect(listRows(page).first()).toBeVisible();
    // The list has no search: look through its pages
    const link = page.locator(`a.table-main-title[href="alerts/${alerts[0].id}"]`);
    for (let pages = 0; pages < 50 && (await link.count()) === 0; pages += 1) {
      const before = await listRows(page).first().innerText();
      await page.locator("li.ant-pagination-next:not(.ant-pagination-disabled)").click();
      await expect(listRows(page).first()).not.toHaveText(before);
    }
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/alerts/${alerts[0].id}$`));
    await expect(page.getByText(alerts[0].name).first()).toBeVisible();
  });
});

test.describe("Groups and data sources lists", () => {
  test("the groups list has no sorting controls and links to the members and data sources of each group", async ({
    page,
    api,
  }) => {
    const admin = (await api.get("/api/groups")).find((g: { name: string }) => g.name === "admin");
    await page.goto("/groups");
    await expect(byTest(page, "GroupList")).toBeVisible();
    await expect(listRows(page).first()).toBeVisible();
    await expect(page.locator("thead th.ant-table-column-has-sorters")).toHaveCount(0);
    await expect(page.getByPlaceholder(/Search/)).toHaveCount(0);
    await expect(page.locator(`a[href="groups/${admin.id}"]`).first()).toBeAttached();
    const row = listRows(page).first();
    await expect(row.getByRole("link", { name: "Members" })).toBeVisible();
    await expect(row.getByRole("link", { name: "Data Sources" })).toBeVisible();
    await expect(row.getByRole("button", { name: "Delete" })).toBeVisible();
  });

  test("the data sources are listed alphabetically; a card opens the data source and Back returns", async ({
    page,
    seed,
  }) => {
    await page.goto("/data_sources");
    const cards = byTest(page, "CardsList").locator(".visual-card");
    await expect(cards.filter({ hasText: DATA_SOURCES.postgres }).first()).toBeVisible();
    const shown = (await cards.allInnerTexts()).map((text) => text.trim());
    expect(shown).toEqual([...shown].sort(byLowerCase));
    for (const name of Object.values(DATA_SOURCES)) {
      if (name !== DATA_SOURCES.mysql || seed.dataSources.mysql !== null) {
        expect(shown).toContain(name);
      }
    }

    await page.locator(`a.visual-card[href="data_sources/${seed.dataSources.postgres}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/data_sources/${seed.dataSources.postgres}$`));
    await expect(byTest(page, "Name")).toHaveValue(DATA_SOURCES.postgres);
    await page.goBack();
    await expect(page).toHaveURL(/\/data_sources$/);
    await expect(cards.filter({ hasText: DATA_SOURCES.postgres }).first()).toBeVisible();
  });
});
