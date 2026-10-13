import { MOD } from "../../support/env";
import { expect, test, uniqueName } from "../../support/fixtures";
import { byTest, createQueryViaApi, getSql, retype, selectOptions, setSql } from "../../support/ui";
import {
  apply,
  chooseType,
  confirmSettings,
  dialog,
  dialogHelp,
  expectPending,
  expectRows,
  field,
  focusEndOfSql,
  newQuery,
  openSettings,
  openSource,
  order,
  param,
  parameter,
  runError,
  savedParameters,
  typeValue,
  valueInput,
} from "./helpers";

const TYPES = [
  "Text",
  "Text Pattern",
  "Number",
  "Dropdown List",
  "Query Based Dropdown List",
  "Date",
  "Date and Time",
  "Date and Time (with seconds)",
  "Date Range",
  "Date and Time Range",
  "Date and Time Range (with seconds)",
];

test.describe("Adding a parameter", () => {
  test("typing {{ city }} in the SQL adds a text parameter that filters the result", async ({ page }) => {
    await newQuery(page);
    const sql = "select id, name, country from cities where name = '{{ city }}'";
    await page.locator('[data-test="QueryEditor"] .ace_content').click();
    await page.keyboard.type(sql, { delay: 20 });
    expect(await getSql(page)).toBe(sql);

    await expect(byTest(param(page, "city"), "TextParamInput")).toBeVisible();
    expect(await order(page)).toEqual(["city"]);
    await expect(param(page, "city").locator("label")).toHaveText("city");

    await typeValue(page, "city", "Paris");
    await expect(valueInput(page, "city")).toHaveAttribute("data-dirty", "true");
    await expectPending(page, 1);
    await apply(page);
    await expectRows(page, [{ id: "6", name: "Paris", country: "France" }]);
  });

  test("the {{ }} button adds a parameter at the cursor and refuses an empty or duplicate keyword", async ({
    page,
  }) => {
    await newQuery(page, "select id, name from cities where name = '{{ city }}'");
    await focusEndOfSql(page);
    await page.keyboard.type(" and id >= ");
    await page.locator(".query-editor-controls button").first().click();
    await expect(dialog(page).locator(".ant-modal-title")).toHaveText("Add Parameter");
    const ok = byTest(page, "SaveParameterSettings");
    await expect(ok).toBeDisabled();
    await expect(dialogHelp(page)).toHaveText("Choose a keyword for this parameter");

    // The keyword field has focus when the dialog opens
    await expect(dialog(page).locator("input").first()).toBeFocused();
    await page.keyboard.type("city");
    await expect(dialogHelp(page)).toHaveText("Parameter with this name already exists");
    await expect(ok).toBeDisabled();

    await retype(page, "min_id");
    await expect(byTest(page, "ParameterTitleInput")).toHaveValue("Min id");
    await expect(ok).toBeEnabled();
    await chooseType(page, "Number");
    await confirmSettings(page);

    expect(await getSql(page)).toBe("select id, name from cities where name = '{{ city }}' and id >= {{ min_id }}");
    expect(await order(page)).toEqual(["city", "min_id"]);
    await expect(valueInput(page, "min_id").locator(".ant-input-number")).toBeVisible();

    await typeValue(page, "min_id", "0");
    await typeValue(page, "city", "Paris");
    await apply(page);
    await expectRows(page, [{ id: "6", name: "Paris" }]);
  });

  test("Cmd/Ctrl+P in the editor opens the Add Parameter dialog; a date range shows how it appears in the query", async ({
    page,
  }) => {
    await newQuery(page, "select name from cities");
    await focusEndOfSql(page);
    await page.keyboard.type(" where id = ");
    await page.keyboard.press(`${MOD}+p`);
    await expect(dialog(page).locator(".ant-modal-title")).toHaveText("Add Parameter");

    // Not `toBeFocused()`: see the fixme below
    await dialog(page).locator("input").first().click();
    await page.keyboard.type("cc");
    await chooseType(page, "Date Range");
    await expect(dialogHelp(page).first()).toHaveText("Appears in query as {{cc.start}} {{cc.end}}");
    await chooseType(page, "Text");
    await expect(dialog(page)).not.toContainText("Appears in query as");
    await confirmSettings(page);

    expect(await getSql(page)).toBe("select name from cities where id = {{ cc }}");
    await typeValue(page, "cc", "6");
    await apply(page);
    await expectRows(page, [{ name: "Paris" }]);
  });

  // Intermittent in the product, so neither a normal test nor an expected failure: on a busy server about one
  // run in five ends with the focus on the dialog's wrapper instead of the Keyword field, and typing goes nowhere.
  // The field's `autoFocus` seems to run while the dialog is still hidden (EditParameterSettingsDialog.jsx).
  test.fixme("Cmd/Ctrl+P puts the focus in the Keyword field of the Add Parameter dialog", async ({ page }) => {
    await newQuery(page, "select name from cities");
    await focusEndOfSql(page);
    await page.keyboard.press(`${MOD}+p`);
    await expect(dialog(page).locator(".ant-modal-title")).toHaveText("Add Parameter");
    await expect(dialog(page).locator("input").first()).toBeFocused();
  });
});

test.describe("Parameter settings dialog", () => {
  test("the type list offers all 11 types, scrolls with the wheel, and a new title is shown and saved", async ({
    page,
    api,
    seed,
  }) => {
    const { id } = await createQueryViaApi(api, {
      name: uniqueName("P settings"),
      dataSourceId: seed.dataSources.postgres,
      sql: "select id, name from cities where name = '{{ city }}'",
      options: { parameters: [parameter({ name: "city", value: "Paris" })] },
    });
    await openSource(page, id);
    await openSettings(page, "city");

    const typeSelect = byTest(dialog(page), "ParameterTypeSelect");
    await typeSelect.locator(".ant-select-selector").click();
    await expect(selectOptions(page).first()).toBeVisible();
    // 11 types and 2 dividers; none of them is rendered lazily
    await expect(selectOptions(page)).toHaveCount(13);
    await expect(selectOptions(page).and(page.locator(":not(.ant-select-item-option-disabled)"))).toHaveText(TYPES);
    await expect(selectOptions(page).and(page.locator(".ant-select-item-option-disabled"))).toHaveCount(2);

    const list = page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)");
    const last = selectOptions(page).last();
    await expect(last).not.toBeInViewport();
    await expect(async () => {
      // The list may still be sliding open: aim at where it is now
      const box = await list.boundingBox();
      if (!box) {
        throw new Error("the type list is not visible");
      }
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, 400);
      await expect(last).toBeInViewport({ timeout: 1000 });
    }).toPass();
    // The options stay attached while scrolling, so the one under the mouse can be clicked
    await last.click();
    await expect(typeSelect.locator(".ant-select-selection-item")).toHaveText("Date and Time Range (with seconds)");
    await chooseType(page, "Text");

    await byTest(page, "ParameterTitleInput").click();
    await retype(page, "City name");
    await confirmSettings(page);
    await expect(param(page, "city").locator("label")).toHaveText("City name");

    // The query had no unsaved changes, so the edit is saved without pressing Save
    await expect
      .poll(async () => (await savedParameters(api, id))[0])
      .toMatchObject({
        name: "city",
        title: "City name",
        type: "text",
      });
    await page.reload();
    await expect(param(page, "city").locator("label")).toHaveText("City name");
  });

  test("editing: a title with HTML is shown as text, Text to Number empties the value, an empty title and Escape are refused or discarded", async ({
    page,
    api,
    seed,
  }) => {
    const { id } = await createQueryViaApi(api, {
      name: uniqueName("P edit"),
      dataSourceId: seed.dataSources.postgres,
      sql: "select '{{ p1 }}' as c1, {{ p2 }} as c2",
      options: { parameters: [parameter({ name: "p1", value: "one" }), parameter({ name: "p2", value: "vp2" })] },
      run: false,
    });
    await openSource(page, id);

    await openSettings(page, "p2");
    await byTest(page, "ParameterTitleInput").click();
    await retype(page, "Second <b>param</b> & co");
    await chooseType(page, "Number");
    await confirmSettings(page);

    const label = param(page, "p2").locator("label");
    await expect(label).toHaveText("Second <b>param</b> & co");
    await expect(label.locator("b")).toHaveCount(0);
    // The label is cut with an ellipsis instead of widening the block
    expect(await label.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    await expect(label).toHaveCSS("text-overflow", "ellipsis");

    // "vp2" is not a number: the field is empty and running reports the missing value
    await expect(field(page, "p2")).toHaveValue("");
    await byTest(page, "ExecuteButton").click();
    await expect(runError(page)).toContainText("Missing value for Second <b>param</b> & co parameter", {
      ignoreCase: true,
    });

    await typeValue(page, "p2", "22");
    await apply(page);
    await expectRows(page, [{ c1: "one", c2: "22" }]);

    // An empty title cannot be confirmed
    await openSettings(page, "p1");
    await byTest(page, "ParameterTitleInput").click();
    await page.keyboard.press(`${MOD}+A`);
    await page.keyboard.press("Backspace");
    await expect(byTest(page, "ParameterTitleInput")).toHaveValue("");
    await expect(byTest(page, "SaveParameterSettings")).toBeDisabled();
    await dialog(page).getByRole("button", { name: "Cancel" }).click();
    await expect(dialog(page)).toHaveCount(0);

    // Escape discards a change made in the dialog
    await openSettings(page, "p1");
    await chooseType(page, "Date");
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveCount(0);
    await expect(byTest(param(page, "p1"), "TextParamInput")).toBeVisible();

    await expect
      .poll(async () => (await savedParameters(api, id)).map((p) => [p.name, p.type, p.title]))
      .toEqual([
        ["p1", "text", "p1"],
        ["p2", "number", "Second <b>param</b> & co"],
      ]);
  });

  test("deleting a {{ }} tag from the SQL removes its parameter; a re-typed name comes back as an empty text parameter", async ({
    page,
    api,
    seed,
  }) => {
    const { id } = await createQueryViaApi(api, {
      name: uniqueName("P remove"),
      dataSourceId: seed.dataSources.postgres,
      sql: "select '{{ p1 }}' as c1, {{ p2 }} as c2, '{{ p3 }}' as c3, {{ p6 }} as c6",
      options: {
        parameters: [
          parameter({ name: "p1", value: "vp1" }),
          parameter({ name: "p2", type: "number", value: 22 }),
          parameter({ name: "p3", value: "vp3" }),
          parameter({ name: "p6", type: "number", value: 6 }),
        ],
      },
    });
    await openSource(page, id);
    await expect(page.locator(".parameter-container")).toBeVisible();
    expect(await order(page)).toEqual(["p1", "p2", "p3", "p6"]);

    await setSql(page, "select '{{ p1 }}' as c1, {{ p2 }} as c2, {{ p6 }} as c6");
    await expect.poll(() => order(page)).toEqual(["p1", "p2", "p6"]);
    await byTest(page, "ExecuteButton").click();
    await expectRows(page, [{ c1: "vp1", c2: "22", c6: "6" }]);
    await byTest(page, "SaveButton").click();
    await expect.poll(async () => (await savedParameters(api, id)).map((p) => p.name)).toEqual(["p1", "p2", "p6"]);

    // p3 returns as a new parameter (text, no value); p6 renamed to p66 is a new parameter too
    await setSql(page, "select '{{ p1 }}' as c1, {{ p2 }} as c2, {{ p66 }} as c6, '{{ p3 }}' as c3");
    await expect.poll(() => order(page)).toEqual(["p1", "p2", "p66", "p3"]);
    await expect(byTest(param(page, "p3"), "TextParamInput")).toHaveValue("");
    await expect(byTest(param(page, "p66"), "TextParamInput")).toHaveValue("");
    await expect(field(page, "p1")).toHaveValue("vp1");
    await expect(field(page, "p2")).toHaveValue("22");

    // Without any tag the parameter bar is gone and the query runs as plain SQL
    await setSql(page, "select 1 as one");
    await expect(page.locator(".parameter-container")).toHaveCount(0);
    await byTest(page, "ExecuteButton").click();
    await expectRows(page, [{ one: "1" }]);
  });
});
