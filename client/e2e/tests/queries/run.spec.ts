import { DATA_SOURCES } from "../../support/env";
import { expect, test } from "../../support/fixtures";
import { knownIssue } from "../../support/known-issues";
import { byTest, drag, getSql, pick, setSql } from "../../support/ui";
import {
  autoLimit,
  clearEditor,
  editor,
  executeButton,
  executionMetadata,
  executionStatus,
  focusEditorEnd,
  MOD,
  openNewQuery,
  resultRows,
  run,
  typeInEditor,
} from "./helpers";

test.describe("Running a query", () => {
  test("Execute is disabled on an empty editor and runs the typed query", async ({ page }) => {
    await openNewQuery(page, DATA_SOURCES.postgres);
    await expect(executeButton(page)).toBeDisabled();

    await typeInEditor(page, "select id, name, country from cities order by id");
    await expect(executeButton(page)).toBeEnabled();
    await expect(executeButton(page)).toHaveText(/^\s*Execute\s*$/);
    const { sent, error } = await run(page);
    expect(error).toBeNull();
    expect(sent.query).toBe("select id, name, country from cities order by id");

    const rows = await resultRows(page);
    expect(rows).toHaveLength(12);
    expect(rows[0]).toEqual(["1", "Tel Aviv", "Israel"]);
    expect(rows[11]).toEqual(["12", "London", "United Kingdom"]);
    await expect(executionMetadata(page)).toContainText(/12\s*rows/);
    await expect(executionMetadata(page)).toContainText(/\d+\s*seconds?\s*runtime/);
    await expect(executionMetadata(page)).toContainText(/Refreshed\s*(just now|a few seconds ago)/);
  });

  test("Cmd/Ctrl+Enter in the editor runs the current text", async ({ page }) => {
    await openNewQuery(page, DATA_SOURCES.postgres);
    await setSql(page, "select id from cities where id = 1");
    expect((await run(page)).error).toBeNull();

    const sql = "select category, count(*) as n from orders group by 1 order by 1";
    await typeInEditor(page, sql);
    const { sent, error } = await run(page, () => page.keyboard.press(`${MOD}+Enter`));
    expect(error).toBeNull();
    expect(sent.query).toBe(sql);
    const rows = await resultRows(page);
    expect(rows.map((row) => row[0])).toEqual(["Hardware", "Services", "Software", "Training"]);
    expect(rows.reduce((sum, row) => sum + Number(row[1].replace(/,/g, "")), 0)).toBe(600);
  });

  test("Execute right after the last keystroke runs the text that is in the editor", async ({ page }) => {
    knownIssue("execute-runs-stale-text");
    await openNewQuery(page, DATA_SOURCES.postgres);
    await setSql(page, "select 1 as a");
    expect((await run(page)).error).toBeNull();

    // The shortcut follows the last key within the 100 ms in which the page does not yet know the new text. To hit
    // that window every time, on a machine of any speed, the page's timers stand still for the two gestures.
    await focusEditorEnd(page);
    await page.clock.install();
    await page.clock.pauseAt(Date.now() + 1000);
    const { sent } = await run(page, async () => {
      await page.keyboard.type(", 2 as b");
      await page.keyboard.press(`${MOD}+Enter`);
      await page.clock.resume();
    });
    expect(await getSql(page)).toBe("select 1 as a, 2 as b");
    expect(sent.query).toBe("select 1 as a, 2 as b");
  });

  test("typing at about ten keys a second keeps every character", async ({ page }) => {
    test.setTimeout(180_000);
    await openNewQuery(page, DATA_SOURCES.postgres);
    const text = "select 1234567890 as abcdefghij, 0987654321 as klmnopqrst -- 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0";
    // The window is around the 100 ms debounce of the editor's change handler; its exact place depends on the machine
    for (const delay of [100, 105, 95, 100, 110]) {
      await clearEditor(page);
      await page.keyboard.type(text, { delay });
      await expect.poll(() => getSql(page), `typed with ${delay} ms between the keys`).toBe(text);
    }
  });

  test("with a selection only the selected text runs", async ({ page }) => {
    await openNewQuery(page, DATA_SOURCES.postgres);
    await setSql(page, "select 'first' as which\nselect 'second' as which, 42 as answer");
    await expect(executeButton(page)).toHaveText(/^\s*Execute\s*$/);

    // Keyboard selection of the second line
    await page.keyboard.press("Home");
    await page.keyboard.press("Shift+End");
    await expect(executeButton(page)).toHaveText(/Execute Selected/);
    let execution = await run(page);
    expect(execution.error).toBeNull();
    expect(execution.sent.query).toBe("select 'second' as which, 42 as answer");
    expect(await resultRows(page)).toEqual([["second", "42"]]);

    // Mouse selection of the first line, run with the shortcut
    const line = await page.locator('[data-test="QueryEditor"] .ace_line').first().boundingBox();
    if (!line) {
      throw new Error("the editor shows no line");
    }
    const y = line.y + line.height / 2;
    await drag(page, { x: line.x + 1, y }, { x: line.x + 400, y });
    await expect(executeButton(page)).toHaveText(/Execute Selected/);
    execution = await run(page, () => page.keyboard.press(`${MOD}+Enter`));
    expect(execution.error).toBeNull();
    expect(execution.sent.query).toBe("select 'first' as which");
    expect(await resultRows(page)).toEqual([["first"]]);

    // Without a selection the button is plain "Execute" again
    await editor(page).click();
    await expect(executeButton(page)).toHaveText(/^\s*Execute\s*$/);
  });
});

test.describe("Query errors", () => {
  test("PostgreSQL: a syntax error and an unknown table are reported, and the editor keeps working", async ({
    page,
  }) => {
    await openNewQuery(page, DATA_SOURCES.postgres);

    await setSql(page, "selec id frm cities");
    let execution = await run(page);
    expect(execution.error).toMatch(/Error running query:.*syntax error at or near "selec".*LINE 1/);
    // Shown in a red box
    await expect(executionStatus(page)).toHaveClass(/ant-alert-error/);

    await setSql(page, "select * from no_such_table_q");
    execution = await run(page);
    expect(execution.error).toMatch(/Error running query:.*relation "no_such_table_q" does not exist/);

    await setSql(page, "select count(*) as cities from cities");
    execution = await run(page);
    expect(execution.error).toBeNull();
    expect(await resultRows(page)).toEqual([["12"]]);
    await expect(executionStatus(page)).toHaveCount(0);
  });

  test("MySQL: a syntax error and an unknown table are reported, and the editor keeps working", async ({
    page,
    seed,
  }) => {
    test.skip(seed.dataSources.mysql === null, "this server has no MySQL driver");
    await openNewQuery(page, DATA_SOURCES.mysql);

    await setSql(page, "selec id frm cities");
    let execution = await run(page);
    expect(execution.error).toMatch(
      /Error running query:.*You have an error in your SQL syntax;.*near 'selec id frm cities' at line 1/
    );

    await setSql(page, "select * from no_such_table_q");
    execution = await run(page);
    expect(execution.error).toMatch(/Error running query:.*Table 'demo\.no_such_table_q' doesn't exist/);

    await setSql(page, "select count(*) as cities from cities");
    execution = await run(page);
    expect(execution.error).toBeNull();
    expect(await resultRows(page)).toEqual([["12"]]);
  });
});

test.describe("Auto limit", () => {
  test("PostgreSQL: LIMIT 1000 is added when ticked, not when unticked or when the query has its own limit", async ({
    page,
  }) => {
    await openNewQuery(page, DATA_SOURCES.postgres);
    const checkbox = autoLimit(page).locator("input");
    await expect(checkbox).toBeChecked();
    await expect(autoLimit(page)).toHaveText("LIMIT 1000");
    // The label sits next to the box, on one line
    const box = await autoLimit(page).boundingBox();
    expect(box?.height).toBeLessThan(40);

    await setSql(page, "select * from generate_series(1,2500) as n");
    let execution = await run(page);
    expect(execution.sent.apply_auto_limit).toBe(true);
    expect(execution.result?.query).toMatch(/generate_series\(1,2500\) as n LIMIT 1000$/);
    expect(execution.result?.data.rows).toHaveLength(1000);
    await expect(executionMetadata(page)).toContainText(/1,?000\s*rows/);

    await autoLimit(page).click();
    await expect(checkbox).not.toBeChecked();
    execution = await run(page);
    expect(execution.sent.apply_auto_limit).toBe(false);
    expect(execution.result?.query).not.toMatch(/LIMIT/);
    expect(execution.result?.data.rows).toHaveLength(2500);
    await expect(executionMetadata(page)).toContainText(/2,?500\s*rows/);

    await autoLimit(page).click();
    await expect(checkbox).toBeChecked();
    await setSql(page, "select * from generate_series(1,2500) as n limit 1500");
    execution = await run(page);
    expect(execution.sent.apply_auto_limit).toBe(true);
    expect(execution.result?.query.match(/limit/gi)).toHaveLength(1);
    expect(execution.result?.data.rows).toHaveLength(1500);
  });

  test("MySQL: LIMIT 1000 is added when ticked and not when unticked", async ({ page, seed }) => {
    test.skip(seed.dataSources.mysql === null, "this server has no MySQL driver");
    await openNewQuery(page, DATA_SOURCES.mysql);
    await expect(autoLimit(page).locator("input")).toBeChecked();
    // 500 x 5 = 2500 rows
    await setSql(
      page,
      "select a.id as a, b.id as b from orders a join (select id from orders where id <= 5) b on 1=1 where a.id <= 500"
    );
    let execution = await run(page);
    expect(execution.sent.apply_auto_limit).toBe(true);
    expect(execution.result?.query).toMatch(/LIMIT 1000$/);
    expect(execution.result?.data.rows).toHaveLength(1000);

    await autoLimit(page).click();
    execution = await run(page);
    expect(execution.sent.apply_auto_limit).toBe(false);
    expect(execution.result?.data.rows).toHaveLength(2500);
  });

  test("the checkbox is disabled for a JSON data source", async ({ page }) => {
    await openNewQuery(page, DATA_SOURCES.postgres);
    await expect(autoLimit(page).locator("input")).toBeEnabled();
    await pick(page, byTest(page, "SelectDataSource"), DATA_SOURCES.json);
    await expect(byTest(page, "SelectDataSource")).toContainText(DATA_SOURCES.json);
    await expect(autoLimit(page).locator("input")).toBeDisabled();
  });
});
