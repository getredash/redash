import type { Page } from "@playwright/test";
import { MOD } from "../../support/env";
import { expect, type RedashApi, test, uniqueName } from "../../support/fixtures";
import { knownIssue } from "../../support/known-issues";
import { byTest, createQueryViaApi } from "../../support/ui";
import {
  apply,
  applyButton,
  choose,
  expectPending,
  expectRows,
  field,
  newQuery,
  openDynamicMenu,
  openSource,
  openView,
  parameter,
  quoted,
  runError,
  shown,
  tags,
  typeDate,
  typeRange,
  typeValue,
  valueInput,
} from "./helpers";

// Brackets keep the result table from formatting the values as dates
const SQL = `select '{{ txt }}' as txt, {{ num }} + 1 as num1, '{{ cat }}' as cat,
 (select string_agg(distinct category, ',' order by category) from orders where category in ({{ cats }})) as cats,
 '[{{ d }}]' as d, '[{{ r.start }} {{ r.end }}]' as r`;

const CATEGORIES = "Hardware\nSoftware\nServices\nTraining";
const INITIAL_ROW = {
  txt: "alpha",
  num1: "2",
  cat: "Hardware",
  cats: "Hardware",
  d: "[2026-01-05]",
  r: "[2026-01-01 2026-01-31]",
};
/** The colour of a field whose value is not applied yet. */
const PENDING_COLOUR = "rgb(255, 252, 225)";

async function createQuery(api: RedashApi, dataSourceId: number) {
  const { id } = await createQueryViaApi(api, {
    name: uniqueName("P apply"),
    dataSourceId,
    sql: SQL,
    options: {
      parameters: [
        parameter({ name: "txt", value: "alpha" }),
        parameter({ name: "num", type: "number", value: 1 }),
        parameter({ name: "cat", type: "enum", enumOptions: CATEGORIES, value: "Hardware" }),
        parameter({
          name: "cats",
          type: "enum",
          enumOptions: CATEGORIES,
          multiValuesOptions: quoted("'"),
          value: ["Hardware"],
        }),
        parameter({ name: "d", type: "date", value: "2026-01-05" }),
        parameter({ name: "r", type: "date-range", value: { start: "2026-01-01", end: "2026-01-31" } }),
      ],
    },
  });
  return id;
}

const searchParams = (page: Page) => Object.fromEntries(new URL(page.url()).searchParams);
const background = (page: Page, name: string, control: string) =>
  valueInput(page, name)
    .locator(control)
    .first()
    .evaluate((element) => getComputedStyle(element).backgroundColor);

test.describe("Applying parameter changes", () => {
  let queryId: number;
  test.beforeAll(async ({ api, seed }) => {
    queryId = await createQuery(api, seed.dataSources.postgres);
  });

  test("Apply Changes counts the pending parameters, blocks Execute meanwhile and re-runs the query", async ({
    page,
  }) => {
    const formats = await openSource(page, queryId);
    await expectRows(page, [INITIAL_ROW]);
    await expectPending(page, 0);
    await expect(byTest(page, "ExecuteButton")).toBeEnabled();

    await typeValue(page, "txt", "beta");
    await expectPending(page, 1);
    await expect(byTest(page, "ExecuteButton")).toBeDisabled();

    await typeValue(page, "num", "41");
    await choose(page, "cat", "Training");
    await expectPending(page, 3);

    await choose(page, "cats", "Services");
    await typeDate(page, "d", shown(formats, "2026-02-06"));
    await expectPending(page, 5);

    // The button tells its keyboard shortcut
    await applyButton(page).locator("button").hover();
    await expect(page.locator(".ant-tooltip:not(.ant-tooltip-hidden)")).toHaveText(/^(⌘|Cmd|Ctrl) \+ Enter$/);

    // A value typed back to what is applied is no longer pending
    await typeValue(page, "txt", "alpha");
    await expectPending(page, 4);
    await expect(valueInput(page, "txt")).not.toHaveAttribute("data-dirty");
    // Nothing ran yet
    await expectRows(page, [INITIAL_ROW]);

    await apply(page);
    await expectRows(page, [
      { ...INITIAL_ROW, num1: "42", cat: "Training", cats: "Hardware,Services", d: "[2026-02-06]" },
    ]);
    await expectPending(page, 0);
    await expect(byTest(page, "ExecuteButton")).toBeEnabled();
  });

  test("Cmd+Enter, Ctrl+Enter and Alt+Enter in a parameter apply the change; plain Enter does not", async ({
    page,
  }) => {
    await openSource(page, queryId);
    await expectRows(page, [INITIAL_ROW]);

    await typeValue(page, "txt", "gamma");
    await page.keyboard.press("Meta+Enter");
    await expectRows(page, [{ ...INITIAL_ROW, txt: "gamma" }]);
    await expectPending(page, 0);

    await typeValue(page, "num", "99");
    await page.keyboard.press("Alt+Enter");
    await expectRows(page, [{ ...INITIAL_ROW, txt: "gamma", num1: "100" }]);

    await typeValue(page, "txt", "delta");
    await page.keyboard.press("Control+Enter");
    await expectRows(page, [{ ...INITIAL_ROW, txt: "delta", num1: "100" }]);

    await typeValue(page, "txt", "epsilon");
    await page.keyboard.press("Enter");
    await expectPending(page, 1);
    await expect(valueInput(page, "txt")).toHaveAttribute("data-dirty", "true");
    await expect(byTest(page, "ExecuteButton")).toBeDisabled();
    expect((await searchParams(page)).p_txt).toBe("delta");
    await apply(page);
    await expectRows(page, [{ ...INITIAL_ROW, txt: "epsilon", num1: "100" }]);
  });

  test("Cmd/Ctrl+Enter also applies on the read-only query page", async ({ page }) => {
    await openView(page, queryId);
    await expectRows(page, [INITIAL_ROW]);
    await typeValue(page, "num", "7");
    await expectPending(page, 1);
    await page.keyboard.press(`${MOD}+Enter`);
    await expectRows(page, [{ ...INITIAL_ROW, num1: "8" }]);
    await expectPending(page, 0);
  });

  test("pending text, number, date and date range fields turn yellow until they are applied", async ({ page }) => {
    const formats = await openSource(page, queryId);
    await expectRows(page, [INITIAL_ROW]);
    const controls = { txt: ".ant-input", num: ".ant-input-number", d: ".ant-picker", r: ".ant-picker" };
    for (const [name, control] of Object.entries(controls)) {
      expect(await background(page, name, control), `${name} before a change`).not.toBe(PENDING_COLOUR);
    }

    await typeValue(page, "txt", "beta");
    await typeValue(page, "num", "41");
    await typeDate(page, "d", shown(formats, "2026-02-06"));
    await typeRange(page, "r", shown(formats, "2026-03-01"), shown(formats, "2026-03-31"));
    await expectPending(page, 4);
    for (const [name, control] of Object.entries(controls)) {
      await expect(valueInput(page, name)).toHaveAttribute("data-dirty", "true");
      await expect.poll(() => background(page, name, control), `${name} while pending`).toBe(PENDING_COLOUR);
    }

    await apply(page);
    for (const [name, control] of Object.entries(controls)) {
      await expect(valueInput(page, name)).not.toHaveAttribute("data-dirty");
      await expect.poll(() => background(page, name, control), `${name} after applying`).not.toBe(PENDING_COLOUR);
    }
  });

  test("a pending dropdown parameter turns yellow like the other fields", async ({ page }) => {
    knownIssue("dropdown-parameter-not-marked-dirty");
    await openSource(page, queryId);
    await expectRows(page, [INITIAL_ROW]);
    await choose(page, "cat", "Training");
    // The change is known to the page (flag and badge); only the colour is missing
    await expect(valueInput(page, "cat")).toHaveAttribute("data-dirty", "true");
    await expectPending(page, 1);
    await expect.poll(() => background(page, "cat", ".ant-select-selector"), { timeout: 3000 }).toBe(PENDING_COLOUR);
  });

  test("a pending multi-value dropdown parameter turns yellow like the other fields", async ({ page }) => {
    knownIssue("dropdown-parameter-not-marked-dirty");
    await openSource(page, queryId);
    await expectRows(page, [INITIAL_ROW]);
    await choose(page, "cats", "Services");
    await expect(valueInput(page, "cats")).toHaveAttribute("data-dirty", "true");
    await expectPending(page, 1);
    await expect.poll(() => background(page, "cats", ".ant-select-selector"), { timeout: 3000 }).toBe(PENDING_COLOUR);
  });
});

test.describe("Parameter values in the URL", () => {
  /** Wednesday 14 October 2026, 10:30:15 in the browser's time zone (Asia/Jerusalem, UTC+3 on that day). */
  const NOW = new Date("2026-10-14T10:30:15+03:00");
  let queryId: number;
  test.beforeAll(async ({ api, seed }) => {
    queryId = await createQuery(api, seed.dataSources.postgres);
  });

  test("applied values are written to the URL, dynamic dates by their name", async ({ page }) => {
    const formats = await openSource(page, queryId);
    await expectRows(page, [INITIAL_ROW]);
    expect(await searchParams(page)).toEqual({
      p_txt: "alpha",
      p_num: "1",
      p_cat: "Hardware",
      p_cats: '["Hardware"]',
      p_d: "2026-01-05",
      p_r: "2026-01-01--2026-01-31",
    });

    await typeValue(page, "txt", "from the page");
    await typeValue(page, "num", "41");
    await choose(page, "cat", "Training");
    await choose(page, "cats", "Services");
    await typeDate(page, "d", shown(formats, "2026-02-06"));
    // Still the applied values while the changes are pending
    expect((await searchParams(page)).p_txt).toBe("alpha");
    await apply(page);
    await expect
      .poll(() => searchParams(page))
      .toEqual({
        p_txt: "from the page",
        p_num: "41",
        p_cat: "Training",
        p_cats: '["Hardware","Services"]',
        p_d: "2026-02-06",
        p_r: "2026-01-01--2026-01-31",
      });

    const dateMenu = await openDynamicMenu(page, "d");
    await dateMenu.locator("li").filter({ hasText: "Yesterday" }).click();
    const rangeMenu = await openDynamicMenu(page, "r");
    await rangeMenu.locator("li").filter({ hasText: "Last month" }).click();
    await apply(page);
    await expect.poll(() => searchParams(page)).toMatchObject({ p_d: "d_yesterday", p_r: "d_last_month" });
  });

  test("an unsaved query keeps parameter values out of the URL", async ({ page }) => {
    await newQuery(page, "select '{{ t }}' as t");
    await typeValue(page, "t", "nothing in the url");
    await apply(page);
    await expectRows(page, [{ t: "nothing in the url" }]);
    expect(new URL(page.url()).pathname).toBe("/queries/new");
    expect(await searchParams(page)).toEqual({});
  });

  test("the query editor opened with p_ values shows them and runs with them", async ({ page }) => {
    const search = `?p_txt=from%20url&p_num=7&p_cat=Software&p_cats=${encodeURIComponent('["Software","Training"]')}&p_d=2026-07-04&p_r=2026-05-01--2026-05-31`;
    const formats = await openSource(page, queryId, search);
    await expect(field(page, "txt")).toHaveValue("from url");
    await expect(field(page, "num")).toHaveValue("7");
    await expect(valueInput(page, "cat").locator(".ant-select-selection-item")).toHaveText("Software");
    await expect(tags(page, "cats")).toHaveText(["Software", "Training"]);
    await expect(field(page, "d")).toHaveValue(shown(formats, "2026-07-04"));
    await expect(field(page, "r").nth(0)).toHaveValue(shown(formats, "2026-05-01"));
    await expect(field(page, "r").nth(1)).toHaveValue(shown(formats, "2026-05-31"));
    await expectPending(page, 0);
    await expectRows(page, [
      {
        txt: "from url",
        num1: "8",
        cat: "Software",
        cats: "Software,Training",
        d: "[2026-07-04]",
        r: "[2026-05-01 2026-05-31]",
      },
    ]);
  });

  test("the read-only page opened with p_ values runs with them, dynamic dates included", async ({ page }) => {
    await page.clock.setFixedTime(NOW);
    const search = `?p_txt=view%20url&p_num=-2&p_cat=Services&p_cats=${encodeURIComponent('["Hardware"]')}&p_d=d_yesterday&p_r=d_last_month`;
    await openView(page, queryId, search);
    await expect(field(page, "txt")).toHaveValue("view url");
    await expect(field(page, "num")).toHaveValue("-2");
    await expect(field(page, "d")).toHaveAttribute("placeholder", "Yesterday");
    await expect(field(page, "r").first()).toHaveAttribute("placeholder", "Last month");
    await expectRows(page, [
      {
        txt: "view url",
        num1: "-1",
        cat: "Services",
        cats: "Hardware",
        d: "[2026-10-13]",
        r: "[2026-09-01 2026-09-30]",
      },
    ]);
  });

  test("invalid values in the URL leave the field empty and are reported; an unknown dropdown value becomes the first option", async ({
    page,
  }) => {
    await openView(page, queryId, "?p_txt=x&p_num=abc&p_cat=Nope&p_zzz=1&p_d=garbage");
    await expect(field(page, "txt")).toHaveValue("x");
    await expect(field(page, "num")).toHaveValue("");
    await expect(field(page, "d")).toHaveValue("");
    await expect(valueInput(page, "cat").locator(".ant-select-selection-item")).toHaveText("Hardware");
    await expect(runError(page)).toContainText("missing values for num, d parameters");
  });
});
