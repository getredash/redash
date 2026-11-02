import type { Page } from "@playwright/test";
import { expect, type RedashApi, test, uniqueName } from "../../support/fixtures";
import { knownIssue } from "../../support/known-issues";
import { byTest, centerOf, createQueryViaApi, drag } from "../../support/ui";
import {
  apply,
  blockBoxes,
  expectPending,
  expectRows,
  field,
  openSource,
  openView,
  order,
  overlaps,
  param,
  parameter,
  savedParameters,
  shown,
  typeDate,
  typeRange,
  typeValue,
} from "./helpers";

const block = (page: Page, name: string) => byTest(page, `ParameterBlock-${name}`);
const handle = (page: Page, name: string) => byTest(page, `DragHandle-${name}`);

async function boxOf(page: Page, name: string) {
  const box = await block(page, name).boundingBox();
  if (!box) {
    throw new Error(`parameter ${name} is not visible`);
  }
  return box;
}

/**
 * Where the mouse must go, holding the handle of `from`, to drop it just after (or before) `to`. The place is
 * decided by the centre of the dragged block, not by the pointer, so the handle is moved by the distance between
 * the two centres plus a little.
 */
async function dropPoint(page: Page, from: string, to: string, side: "after" | "before") {
  const start = await centerOf(handle(page, from));
  const fromBox = await boxOf(page, from);
  const toBox = await boxOf(page, to);
  const dx = toBox.x + toBox.width / 2 - (fromBox.x + fromBox.width / 2) + (side === "after" ? 15 : -15);
  const dy = toBox.y + toBox.height / 2 - (fromBox.y + fromBox.height / 2);
  return { start, end: { x: start.x + dx, y: start.y + dy } };
}

/** Drags a parameter by its handle with the mouse and drops it after (or before) another one. */
async function dragParameter(page: Page, from: string, to: string, side: "after" | "before") {
  const { start, end } = await dropPoint(page, from, to, side);
  await drag(page, start, end, { steps: 20 });
}

async function createFourTextParameters(api: RedashApi, dataSourceId: number) {
  const { id } = await createQueryViaApi(api, {
    name: uniqueName("P reorder"),
    dataSourceId,
    sql: "select '{{ alpha }}' as a, '{{ beta }}' as b, '{{ gamma }}' as c, '{{ delta }}' as d",
    options: {
      parameters: ["alpha", "beta", "gamma", "delta"].map((name) =>
        parameter({ name, value: `${name[0].toUpperCase()}1` })
      ),
    },
  });
  return id;
}

/** Nine parameters of different widths; at 1440 px they need three rows. */
const MANY = {
  sql: "select '{{ p1 }}' as c1, '{{ p2 }}' as c2, '{{ p3 }}' as c3, '{{ p4 }}' as c4,\n '{{ p5 }}' as c5, {{ p6 }} as c6, '[{{ p7.start }} {{ p7.end }}]' as c7, '{{ p8 }}' as c8, '{{ a_very_long_parameter_name_to_see_how_the_label_is_cut }}' as c9",
  long: "a_very_long_parameter_name_to_see_how_the_label_is_cut",
  names: ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "a_very_long_parameter_name_to_see_how_the_label_is_cut"],
};

async function createManyParameters(api: RedashApi, dataSourceId: number, withValues: boolean) {
  const value = <T>(v: T) => (withValues ? v : null);
  const { id } = await createQueryViaApi(api, {
    name: uniqueName("P many"),
    dataSourceId,
    sql: MANY.sql,
    options: {
      parameters: [
        parameter({ name: "p1", value: value("v1") }),
        parameter({ name: "p2", value: value("v2") }),
        parameter({ name: "p3", value: value("v3") }),
        parameter({ name: "p4", value: value("v4") }),
        parameter({ name: "p5", type: "datetime-with-seconds", value: value("2026-05-05 05:05:05") }),
        parameter({ name: "p6", type: "number", value: value(6) }),
        parameter({
          name: "p7",
          type: "datetime-range-with-seconds",
          value: value({ start: "2026-07-07 07:07:07", end: "2026-07-08 08:08:08" }),
        }),
        parameter({ name: "p8", value: value("v8") }),
        parameter({ name: MANY.long, value: value("v9") }),
      ],
    },
    run: withValues,
  });
  return id;
}

test.describe("Reordering parameters", () => {
  test("dragging a parameter by its handle moves it; a click or a drag there and back changes nothing", async ({
    page,
    api,
    seed,
  }) => {
    const id = await createFourTextParameters(api, seed.dataSources.postgres);
    await openSource(page, id);
    await expectRows(page, [{ a: "A1", b: "B1", c: "G1", d: "D1" }]);
    expect(await order(page)).toEqual(["alpha", "beta", "gamma", "delta"]);

    await dragParameter(page, "alpha", "gamma", "after");
    await expect.poll(() => order(page)).toEqual(["beta", "gamma", "alpha", "delta"]);

    await dragParameter(page, "delta", "beta", "before");
    await expect.poll(() => order(page)).toEqual(["delta", "beta", "gamma", "alpha"]);

    // A click on the handle is not a drag
    const grip = await centerOf(handle(page, "beta"));
    await page.mouse.move(grip.x, grip.y);
    await page.mouse.down();
    await page.mouse.up();
    // Neither is a drag that returns to where it started
    await page.mouse.down();
    await page.mouse.move(grip.x + 60, grip.y, { steps: 8 });
    await page.waitForTimeout(200); // holding the parameter over its neighbour is part of the gesture
    await page.mouse.move(grip.x, grip.y, { steps: 8 });
    await page.waitForTimeout(200);
    await page.mouse.up();
    await expect(block(page, "beta")).not.toHaveClass(/parameter-dragged/);
    expect(await order(page)).toEqual(["delta", "beta", "gamma", "alpha"]);
    await expect
      .poll(async () => (await savedParameters(api, id)).map((p) => p.name))
      .toEqual(["delta", "beta", "gamma", "alpha"]);
  });

  test("the new order is saved right after the drop and survives a reload, values stay with their parameters", async ({
    page,
    api,
    seed,
  }) => {
    const id = await createFourTextParameters(api, seed.dataSources.postgres);
    await openSource(page, id);
    await expectRows(page, [{ a: "A1", b: "B1", c: "G1", d: "D1" }]);

    await dragParameter(page, "alpha", "gamma", "after");
    await expect.poll(() => order(page)).toEqual(["beta", "gamma", "alpha", "delta"]);
    // No Save press is needed, and the Save button does not mark the query as changed
    await expect
      .poll(async () => (await savedParameters(api, id)).map((p) => [p.name, p.value]))
      .toEqual([
        ["beta", "B1"],
        ["gamma", "G1"],
        ["alpha", "A1"],
        ["delta", "D1"],
      ]);
    await expect(byTest(page, "SaveButton")).not.toContainText("*");

    await page.reload();
    await expect(block(page, "alpha")).toBeVisible();
    expect(await order(page)).toEqual(["beta", "gamma", "alpha", "delta"]);
    await expectRows(page, [{ a: "A1", b: "B1", c: "G1", d: "D1" }]);
    for (const [name, value] of [
      ["alpha", "A1"],
      ["beta", "B1"],
      ["gamma", "G1"],
      ["delta", "D1"],
    ]) {
      await expect(field(page, name)).toHaveValue(value);
    }

    await typeValue(page, "gamma", "G2");
    await apply(page);
    await expectRows(page, [{ a: "A1", b: "B1", c: "G2", d: "D1" }]);

    // The read-only page shows the same order, without handles
    await openView(page, id);
    await expect(block(page, "alpha")).toBeVisible();
    expect(await order(page)).toEqual(["beta", "gamma", "alpha", "delta"]);
    await expect(page.locator('[data-test^="DragHandle-"]')).toHaveCount(0);
  });

  test("keyboard: Tab reaches a handle, Space / ArrowRight / Space moves the parameter, Escape cancels a move", async ({
    page,
    api,
    seed,
  }) => {
    const id = await createFourTextParameters(api, seed.dataSources.postgres);
    await openSource(page, id);
    await expectRows(page, [{ a: "A1", b: "B1", c: "G1", d: "D1" }]);

    await field(page, "alpha").click();
    await page.keyboard.press("Tab");
    await expect(handle(page, "beta")).toBeFocused();
    await expect(handle(page, "beta")).toHaveAttribute("role", "button");

    // What a screen reader is told (the library's default wording) shows each key was taken
    const announced = page.locator('[id^="DndLiveRegion"]');
    // The arrow keys are listened to a moment after the pick-up is announced; a key pressed before that is lost
    const arrowRightUntil = (text: RegExp) =>
      expect(async () => {
        await page.keyboard.press("ArrowRight");
        await expect(announced).toHaveText(text, { timeout: 1500 });
      }).toPass();
    await page.keyboard.press("Space");
    await expect(announced).toHaveText(/Picked up draggable item item-1|item-1 was moved over droppable area item-1/);
    await arrowRightUntil(/item-1 was moved over droppable area item-2/);
    await page.keyboard.press("Space");
    await expect(announced).toHaveText(/item-1 was dropped over droppable area item-2/);
    await expect.poll(() => order(page)).toEqual(["alpha", "gamma", "beta", "delta"]);

    // A second move, cancelled
    await expect(handle(page, "beta")).toBeFocused();
    await page.keyboard.press("Space");
    await expect(announced).toHaveText(/Picked up draggable item item-2|item-2 was moved over droppable area item-2/);
    await arrowRightUntil(/item-2 was moved over droppable area item-3/);
    await page.keyboard.press("Escape");
    await expect(announced).toHaveText(/cancelled/);
    expect(await order(page)).toEqual(["alpha", "gamma", "beta", "delta"]);

    await expect
      .poll(async () => (await savedParameters(api, id)).map((p) => p.name))
      .toEqual(["alpha", "gamma", "beta", "delta"]);
    await page.reload();
    await expect(block(page, "alpha")).toBeVisible();
    expect(await order(page)).toEqual(["alpha", "gamma", "beta", "delta"]);
  });

  test("a drag handle that has keyboard focus shows it", async ({ page, api, seed }) => {
    knownIssue("drag-handle-no-focus-style");
    const id = await createFourTextParameters(api, seed.dataSources.postgres);
    await openSource(page, id);
    await field(page, "alpha").click();
    await page.keyboard.press("Tab");
    await expect(handle(page, "beta")).toBeFocused();
    // Any visible sign will do: an outline, a shadow, a border or another background than the unfocused handle
    const look = (name: string) =>
      handle(page, name).evaluate((element) => {
        const style = getComputedStyle(element);
        const outline = style.outlineStyle === "none" ? "none" : `${style.outlineStyle} ${style.outlineWidth}`;
        return [outline, style.boxShadow, style.borderStyle, style.backgroundColor, style.color].join(" | ");
      });
    await expect.poll(async () => (await look("beta")) !== (await look("gamma")), { timeout: 3000 }).toBe(true);
  });
});

test.describe("Many parameters", () => {
  test("nine parameters of different widths wrap onto rows without overlapping or leaving the page", async ({
    page,
    api,
    seed,
  }) => {
    const id = await createManyParameters(api, seed.dataSources.postgres, false);
    const formats = await openSource(page, id);
    await expect(block(page, MANY.long)).toBeVisible();
    expect(await order(page)).toEqual(MANY.names);

    const { boxes, windowWidth } = await blockBoxes(page);
    expect(new Set(boxes.map((box) => Math.round(box.top))).size, "rows of parameters").toBe(3);
    expect(overlaps(boxes)).toEqual([]);
    for (const box of boxes) {
      expect(box.left, `${box.name} starts inside the page`).toBeGreaterThanOrEqual(0);
      expect(box.right, `${box.name} ends inside the page`).toBeLessThanOrEqual(windowWidth);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    // The long name is cut with an ellipsis instead of stretching its block
    const label = param(page, MANY.long).locator("label");
    await expect(label).toHaveCSS("text-overflow", "ellipsis");
    expect(await label.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);

    for (const name of ["p1", "p2", "p3", "p4", "p8", MANY.long]) {
      await typeValue(page, name, `v-${name.slice(0, 2)}`);
    }
    await typeValue(page, "p6", "6");
    await typeDate(page, "p5", shown(formats, "2026-05-05 05:05:05"));
    await typeRange(page, "p7", shown(formats, "2026-07-07 07:07:07"), shown(formats, "2026-07-08 08:08:08"));
    await expectPending(page, 9);
    await apply(page);
    await expectRows(page, [
      {
        c1: "v-p1",
        c2: "v-p2",
        c3: "v-p3",
        c4: "v-p4",
        c5: "2026-05-05 05:05:05",
        c6: "6",
        c7: "[2026-07-07 07:07:07 2026-07-08 08:08:08]",
        c8: "v-p8",
        c9: "v-a_",
      },
    ]);
  });

  test("a parameter can be dragged from the last row to the first position", async ({ page, api, seed }) => {
    const id = await createManyParameters(api, seed.dataSources.postgres, true);
    await openSource(page, id);
    await expect(block(page, MANY.long)).toBeVisible();
    expect(await order(page)).toEqual(MANY.names);
    const before = await blockBoxes(page);
    expect(before.boxes[8].top).toBeGreaterThan(before.boxes[0].top + 20);

    await dragParameter(page, MANY.long, "p1", "before");
    const moved = [MANY.long, ...MANY.names.slice(0, 8)];
    await expect.poll(() => order(page)).toEqual(moved);
    await expect.poll(async () => (await savedParameters(api, id)).map((p) => p.name)).toEqual(moved);

    const after = await blockBoxes(page);
    expect(overlaps(after.boxes)).toEqual([]);
    expect(Math.round(after.boxes[0].top)).toBe(Math.round(before.boxes[0].top));
    expect(Math.round(after.boxes[0].left)).toBe(Math.round(before.boxes[0].left));
  });

  test("while one parameter is dragged across rows the others neither overlap nor leave the page", async ({
    page,
    api,
    seed,
  }) => {
    knownIssue("parameters-overlap-while-dragging");
    const id = await createManyParameters(api, seed.dataSources.postgres, true);
    await openSource(page, id);
    await expect(block(page, MANY.long)).toBeVisible();
    const { start, end } = await dropPoint(page, MANY.long, "p1", "before");

    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    const steps = 20;
    const problems: string[] = [];
    try {
      for (let step = 1; step <= steps; step += 1) {
        await page.mouse.move(
          start.x + ((end.x - start.x) * step) / steps,
          start.y + ((end.y - start.y) * step) / steps
        );
        await page.waitForTimeout(250); // let the other parameters finish sliding before measuring
        const { boxes, windowWidth } = await blockBoxes(page);
        const others = boxes.filter((box) => box.name !== MANY.long);
        problems.push(
          ...overlaps(others).map((pair) => `step ${step}: ${pair} overlap`),
          ...others.filter((box) => box.right > windowWidth + 1).map((box) => `step ${step}: ${box.name} off screen`)
        );
      }
    } finally {
      await page.mouse.up();
    }
    expect(problems).toEqual([]);
  });
});
