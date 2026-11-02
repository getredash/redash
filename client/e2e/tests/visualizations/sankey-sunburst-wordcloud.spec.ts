import type { Locator, Page } from "@playwright/test";
import { expect, test, uniqueName } from "../../support/fixtures";
import { centerOf } from "../../support/ui";
import {
  activePane,
  choose,
  hoverAt,
  newVisualization,
  openSourcePage,
  openViewPage,
  parkMouse,
  type Point,
  preview,
  type Row,
  resultRows,
  SLOW_INSTANCE_TIMEOUT,
  savedVisualization,
  saveVisualization,
  seedQuery,
  typeIn,
} from "./helpers";

// The editor tests make many round trips; on a loaded server they need more than the default 90 seconds
test.describe.configure({ timeout: SLOW_INSTANCE_TIMEOUT });

// The order in which each of the 240 users went through the stages: stage1..stage5 and the number of users
const PATHS_SQL = `with s as (select user_id, array_agg(stage order by event_date, id) as st from events group by 1)
select st[1] as stage1, st[2] as stage2, st[3] as stage3, st[4] as stage4, st[5] as stage5, count(*) as value
from s group by 1, 2, 3, 4, 5 order by 6 desc`;
// The same journeys in the other format a sunburst accepts: one row per step
const SEQUENCES_SQL = `with e as (
  select user_id, stage, row_number() over (partition by user_id order by event_date, id) as n from events)
select user_id as sequence, n as stage, stage as node, 1 as value from e where n <= 4 order by 1, 2`;
const WORDS_SQL = `select c.name as word, count(*) as freq from orders o join cities c on c.id = o.city_id group by 1
union all select category, count(*) from orders group by 1
union all select channel, count(*) from orders group by 1
union all select customer, count(*) from orders group by 1`;

const sankey = (scope: Page | Locator) => scope.locator(".sankey-visualization-container").first();
const sunburst = (scope: Page | Locator) => scope.locator(".sunburst-visualization-container").first();
const segments = (scope: Page | Locator) => sunburst(scope).locator("path.nodePath");
const wordCloud = (scope: Page | Locator) => scope.locator(".word-cloud-visualization-container").first();
const words = (scope: Page | Locator) => wordCloud(scope).locator("svg text");

/** How many nodes and links of the sankey are dimmed. */
function dimmed(scope: Page | Locator): Promise<{ nodes: number; links: number }> {
  return sankey(scope).evaluate((container) => {
    const faded = (selector: string) =>
      Array.from(container.querySelectorAll<SVGElement>(selector)).filter(
        (element) => element.style.opacity !== "" && Number(element.style.opacity) < 1
      ).length;
    return { nodes: faded(".node"), links: faded(".link") };
  });
}

interface Segment extends Point {
  /** Names of the segment and its ancestors, outermost last. */
  names: string[];
  value: number;
  total: number;
}

/**
 * A point inside a sunburst segment of the given ring (1 = innermost), with what the chart knows about that
 * segment. Only reads the page: the mouse is moved by the test.
 */
async function segmentInRing(page: Page, ring: number, skip = 0): Promise<Segment> {
  const found = await sunburst(page)
    .locator(".sunburst-container svg")
    .evaluate(
      (svg, [depth, toSkip]) => {
        const frame = svg.getBoundingClientRect();
        const datum = (element: Element | null) => (element as any)?.__data__;
        const seen = new Set<Element>();
        for (let y = frame.top + 4; y < frame.bottom - 4; y += 5) {
          for (let x = frame.left + 4; x < frame.right - 4; x += 5) {
            const element = document.elementFromPoint(x, y);
            if (!element?.classList.contains("nodePath") || datum(element)?.depth !== depth || seen.has(element)) {
              continue;
            }
            // Well inside the segment: the points around it hit the same segment
            const inside = [
              [-3, 0],
              [3, 0],
              [0, -3],
              [0, 3],
            ].every(([dx, dy]) => document.elementFromPoint(x + dx, y + dy) === element);
            if (!inside) {
              continue;
            }
            seen.add(element);
            if (seen.size <= toSkip) {
              continue;
            }
            const names: string[] = [];
            let node = datum(element);
            let root = node;
            while (node?.parent) {
              names.unshift(node.data?.name ?? node.name);
              node = node.parent;
              root = node;
            }
            return { x, y, names, value: node === root ? datum(element).value : 0, total: root.value };
          }
        }
        return null;
      },
      [ring, skip]
    );
  if (!found) {
    throw new Error(`no segment found in ring ${ring}`);
  }
  return found;
}

/** The breadcrumbs above the sunburst: texts and horizontal positions. */
function crumbs(page: Page): Promise<{ text: string; x: number }[]> {
  return sunburst(page)
    .locator(".breadcrumbs-container g")
    .evaluateAll((groups) =>
      groups
        .filter((group) => group.querySelector("polygon"))
        .map((group) => ({
          text: group.querySelector("text")?.textContent || "",
          x: Math.round(group.getBoundingClientRect().x),
        }))
    );
}

const share = (segment: Segment) => {
  const percentage = ((100 * segment.value) / segment.total).toPrecision(3);
  return Number(percentage) < 1 ? "< 1.0%" : `${percentage}%`;
};

/** Hovers a segment in every ring and checks breadcrumbs, the summary in the centre and the dimming. */
async function checkHoverOfEveryRing(page: Page, rings: number, total: number) {
  const count = await segments(page).count();
  for (let ring = 1; ring <= rings; ring += 1) {
    // Not always the first segment of a ring: take a later one in the outer rings
    const segment = await segmentInRing(page, ring, ring > 2 ? 3 : 0);
    expect(segment.names).toHaveLength(ring);
    expect(segment.total).toBe(total);
    await hoverAt(page, segment);

    await expect
      .poll(async () => (await crumbs(page)).map((crumb) => crumb.text), `ring ${ring}`)
      .toEqual(segment.names);
    // One crumb per ancestor, side by side (not on top of each other)
    const positions = (await crumbs(page)).map((crumb) => crumb.x);
    for (let index = 1; index < positions.length; index += 1) {
      expect(positions[index] - positions[index - 1], `crumbs of ring ${ring} at ${positions}`).toBeGreaterThan(100);
    }
    // The share of this path: after the last crumb and in the centre
    const lastCrumb = sunburst(page).locator(".lastCrumb");
    await expect(lastCrumb).toHaveText(share(segment));
    const lastX = (await lastCrumb.boundingBox())?.x ?? 0;
    expect(lastX).toBeGreaterThan(positions[positions.length - 1]);
    await expect(sunburst(page).locator(".summary-container")).toHaveText(
      new RegExp(
        `^\\s*Stage: ${ring}\\s+${share(segment).replace(/[.<]/g, "\\$&")}\\s+${segment.value} of ${total}\\s*$`
      )
    );
    // Everything except the hovered path is dimmed (the hidden root segment counts as dimmed too)
    await expect(sunburst(page).locator('path.nodePath[opacity="1"]')).toHaveCount(ring);
    await expect(sunburst(page).locator('path.nodePath[opacity="0.3"]')).toHaveCount(count - ring);
  }
}

test.describe("Sankey visualization", () => {
  test("draws the flows and highlights what is connected to the hovered node", async ({ page, api, seed }) => {
    const queryId = await seedQuery(api, seed.dataSources.postgres, uniqueName("V sankey"), PATHS_SQL);
    await openSourcePage(page, queryId);
    await newVisualization(page, "SANKEY", "Sankey A");
    await expect(sankey(preview(page)).locator(".node")).toHaveCount(19);
    await expect(sankey(preview(page)).locator(".link")).toHaveCount(59);
    const saved = await saveVisualization(page);
    expect((await savedVisualization(api, queryId, saved.id)).type).toBe("SANKEY");

    await openViewPage(page, queryId, saved.id);
    const nodes = sankey(page).locator(".node");
    const links = sankey(page).locator(".link");
    await expect(nodes).toHaveCount(19);
    await expect(links).toHaveCount(59);
    // One colour per stage name
    expect(
      await nodes.evaluateAll((list) => new Set(list.map((node) => node.querySelector("rect")?.style.fill)).size)
    ).toBe(4);
    expect(
      await nodes.evaluateAll((list) =>
        [...new Set(list.map((node) => node.querySelector("text")?.textContent))].sort()
      )
    ).toEqual(["paid", "signup", "trial", "visit"]);
    expect(await sankey(page).locator("svg").innerHTML()).not.toContain("NaN");
    // The chart fills its pane
    const pane = await activePane(page).boundingBox();
    const svg = await sankey(page).locator("svg").boundingBox();
    expect(svg?.width).toBeGreaterThan(900);
    expect(svg?.height).toBeGreaterThan(400);
    expect(Math.abs((svg?.width ?? 0) - (pane?.width ?? 0))).toBeLessThan(40);
    expect(await dimmed(page)).toEqual({ nodes: 0, links: 0 });

    // Hovering a node dims the nodes and links that are not connected to it
    for (const index of [0, 5]) {
      const target = await nodes.nth(index).evaluate((node) => {
        const datum = (node as any).__data__;
        const data = (selector: string) =>
          Array.from(node.closest("svg")?.querySelectorAll(selector) || []).map((element) => (element as any).__data__);
        // Only what is drawn counts: the links and nodes that have an element
        const links = data(".link").filter((link) => link.source === datum || link.target === datum);
        const others = new Set(links.flatMap((link) => [link.source, link.target]));
        others.delete(datum);
        const connected = data(".node").filter((other) => others.has(other));
        // A point of the node's bar that no label of another node covers
        const rect = node.querySelector("rect") as SVGRectElement;
        const box = rect.getBoundingClientRect();
        let point: { x: number; y: number } | null = null;
        for (let y = box.top + 3; y < box.bottom - 2 && !point; y += 4) {
          if (document.elementFromPoint(box.left + box.width / 2, y) === rect) {
            point = { x: box.left + box.width / 2, y };
          }
        }
        return { links: links.length, neighbours: connected.length, point };
      });
      expect(target.links).toBeGreaterThan(0);
      expect(target.point, `node ${index} has a free spot to hover`).not.toBeNull();
      await hoverAt(page, target.point as Point);
      await expect
        .poll(() => dimmed(page), `node ${index}`)
        .toEqual({ nodes: 19 - 1 - target.neighbours, links: 59 - target.links });
    }
    // The first node is "signup" as first stage: 4 of the 59 links and 4 of the other 18 nodes belong to it
    expect(
      await nodes
        .nth(0)
        .evaluate((node) => (node as unknown as { __data__: { sourceLinks: unknown[] } }).__data__.sourceLinks.length)
    ).toBe(4);
    await expect(nodes.nth(0).locator("title")).toHaveText(/^signup\s+93$/);
    // Leaving the node restores everything
    await parkMouse(page);
    await expect.poll(() => dimmed(page)).toEqual({ nodes: 0, links: 0 });

    // Links have a native tooltip ("from → to" and the value) and no highlight of their own
    const widest = await links.evaluateAll((list) => {
      const index = list
        .map((link, i) => ({ i, width: parseFloat((link as SVGElement).style.strokeWidth) }))
        .sort((a, b) => b.width - a.width)[0].i;
      const link = list[index] as SVGPathElement;
      const middle = link.getPointAtLength(link.getTotalLength() / 2);
      const matrix = link.getScreenCTM() as DOMMatrix;
      return {
        title: link.querySelector("title")?.textContent,
        x: middle.x * matrix.a + middle.y * matrix.c + matrix.e,
        y: middle.x * matrix.b + middle.y * matrix.d + matrix.f,
      };
    });
    expect(widest.title).toMatch(/^signup → visit\s+36$/);
    await hoverAt(page, widest);
    expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.getAttribute("class"), widest)).toBe(
      "link"
    );
    expect(await dimmed(page)).toEqual({ nodes: 0, links: 0 });
  });
});

test.describe("Sunburst visualization", () => {
  test("stage1..N rows: hovering shows the path as breadcrumbs with its share", async ({ page, api, seed }) => {
    const queryId = await seedQuery(api, seed.dataSources.postgres, uniqueName("V sunburst"), PATHS_SQL);
    await openSourcePage(page, queryId);
    await newVisualization(page, "SUNBURST_SEQUENCE", "Sunburst stages");
    await expect(segments(preview(page))).toHaveCount(278);
    const saved = await saveVisualization(page);

    await openViewPage(page, queryId, saved.id);
    await expect(segments(page)).toHaveCount(278);
    // One colour per stage name, plus the hidden root
    expect(
      await segments(page).evaluateAll((list) => new Set(list.map((path) => path.getAttribute("fill"))).size)
    ).toBe(5);
    expect(await sunburst(page).innerHTML()).not.toContain("NaN");
    expect(await crumbs(page)).toEqual([]);
    const svg = await sunburst(page).locator(".sunburst-container svg").boundingBox();
    expect(svg?.width).toBeGreaterThan(400);
    expect(svg?.width).toBe(svg?.height);

    await checkHoverOfEveryRing(page, 5, 240);

    // The highlight stays when the mouse leaves the chart; a click clears it
    const before = await crumbs(page);
    expect(before).toHaveLength(5);
    await parkMouse(page);
    expect(await crumbs(page)).toEqual(before);
    await expect(sunburst(page).locator('path.nodePath[opacity="0.3"]')).toHaveCount(273);
    const inner = await segmentInRing(page, 1);
    await page.mouse.move(inner.x, inner.y, { steps: 10 });
    await page.mouse.down();
    await page.mouse.up();
    await parkMouse(page);
    await expect(sunburst(page).locator('path.nodePath[opacity="0.3"]')).toHaveCount(0);
    await expect(sunburst(page).locator(".breadcrumbs-container svg")).toHaveCSS("visibility", "hidden");
    await expect(sunburst(page).locator(".summary-container")).toHaveCSS("visibility", "hidden");
  });

  test("sequence/stage/node/value rows draw the same kind of chart", async ({ page, api, seed }) => {
    const queryId = await seedQuery(api, seed.dataSources.postgres, uniqueName("V sunburst seq"), SEQUENCES_SQL);
    await openSourcePage(page, queryId);
    await newVisualization(page, "SUNBURST_SEQUENCE", "Sunburst sequences");
    await expect(segments(preview(page))).toHaveCount(161);
    const saved = await saveVisualization(page);

    await openViewPage(page, queryId, saved.id);
    await expect(segments(page)).toHaveCount(161);
    expect(
      await segments(page).evaluateAll((list) => new Set(list.map((path) => path.getAttribute("fill"))).size)
    ).toBe(5);
    await checkHoverOfEveryRing(page, 4, 182);

    // The chart follows the size of the window
    await parkMouse(page);
    const large = await sunburst(page).locator(".sunburst-container svg").boundingBox();
    await page.setViewportSize({ width: 1000, height: 700 });
    await expect
      .poll(async () => (await sunburst(page).locator(".sunburst-container svg").boundingBox())?.width)
      .toBeLessThan((large?.width ?? 0) - 100);
    await expect(segments(page)).toHaveCount(161);
    const small = await sunburst(page).locator(".sunburst-container svg").boundingBox();
    expect(small?.width).toBeGreaterThan(250);
    expect(small?.width).toBe(small?.height);
  });
});

test.describe("Word cloud visualization", () => {
  /** Words with their font size, largest first. */
  const sized = (scope: Page | Locator) =>
    words(scope).evaluateAll((texts) =>
      texts
        .map((text) => ({ word: text.textContent || "", size: parseFloat((text as SVGElement).style.fontSize) }))
        .sort((a, b) => b.size - a.size || a.word.localeCompare(b.word))
    );

  test("the editor sets the words and frequencies columns and the limits", async ({ page, api, seed }) => {
    const queryId = await seedQuery(api, seed.dataSources.postgres, uniqueName("V words"), WORDS_SQL);
    const rows = await resultRows(api, queryId);
    const frequency = (row: Row) => Number(row.freq);
    const length = (row: Row) => String(row.word).length;
    expect(rows).toHaveLength(99);
    await openSourcePage(page, queryId);
    await newVisualization(page, "WORD_CLOUD", "Words A");
    const pv = preview(page);
    await expect(words(pv)).toHaveCount(0);

    // Only a words column: the text is split into words and every word counts once, so all have the smallest size
    await choose(page, "WordCloud.WordsColumn", "WordCloud.WordsColumn.word");
    await expect(words(pv)).toHaveCount(101);
    expect(new Set((await sized(pv)).map((item) => item.size))).toEqual(new Set([10]));
    expect((await sized(pv)).map((item) => item.word)).toEqual(expect.arrayContaining(["Sao", "Paulo", "Tel", "Aviv"]));

    // With a frequencies column the size follows the frequency: 10px for the rarest, 100px for the most frequent
    await choose(page, "WordCloud.FrequenciesColumn", "WordCloud.FrequenciesColumn.freq");
    await expect(words(pv)).toHaveCount(99);
    const all = await sized(pv);
    const byFrequency = [...rows].sort((a, b) => frequency(b) - frequency(a));
    expect(all[0]).toEqual({ word: byFrequency[0].word, size: 100 });
    expect(all.slice(0, 7).map((item) => item.word)).toEqual(byFrequency.slice(0, 7).map((row) => row.word));
    expect(all[all.length - 1].size).toBe(10);
    // Sizes are in step with the frequencies: linear between the rarest and the most frequent word
    const [rarest, top] = [frequency(byFrequency[byFrequency.length - 1]), frequency(byFrequency[0])];
    for (const item of all) {
      const row = rows.find((candidate) => candidate.word === item.word) as Row;
      const expected = 10 + (90 * (frequency(row) - rarest)) / (top - rarest);
      expect(Math.abs(item.size - expected), `size of "${item.word}"`).toBeLessThanOrEqual(1);
    }
    expect(new Set(all.map((item) => item.size)).size).toBeGreaterThan(10);
    expect(
      await words(pv).evaluateAll((texts) => new Set(texts.map((text) => (text as SVGElement).style.fill)).size)
    ).toBeGreaterThan(10);

    await typeIn(page, "WordCloud.WordLengthLimit.Min", "4");
    await typeIn(page, "WordCloud.WordLengthLimit.Max", "9");
    const byLength = rows.filter((row) => length(row) >= 4 && length(row) <= 9);
    expect(byLength).toHaveLength(18);
    await expect
      .poll(async () => (await sized(pv)).map((item) => item.word).sort())
      .toEqual(byLength.map((row) => String(row.word)).sort());

    await typeIn(page, "WordCloud.WordCountLimit.Min", "40");
    await typeIn(page, "WordCloud.WordCountLimit.Max", "200");
    const byCount = byLength.filter((row) => frequency(row) >= 40 && frequency(row) <= 200);
    expect(byCount).toHaveLength(16);
    await expect
      .poll(async () => (await sized(pv)).map((item) => item.word).sort())
      .toEqual(byCount.map((row) => String(row.word)).sort());

    for (const limit of ["WordCountLimit.Min", "WordCountLimit.Max", "WordLengthLimit.Min", "WordLengthLimit.Max"]) {
      await typeIn(page, `WordCloud.${limit}`, "");
    }
    await expect(words(pv)).toHaveCount(99);

    const saved = await saveVisualization(page);
    expect((await savedVisualization(api, queryId, saved.id)).options).toMatchObject({
      column: "word",
      frequenciesColumn: "freq",
      wordCountLimit: { min: null, max: null },
      wordLengthLimit: { min: null, max: null },
    });

    await openViewPage(page, queryId, saved.id);
    await expect(words(page)).toHaveCount(99);
    expect((await sized(page))[0]).toEqual({ word: byFrequency[0].word, size: 100 });
    // The cloud is as high as its pane, and follows the window
    const large = await wordCloud(page).locator("svg").boundingBox();
    expect(large?.height).toBeGreaterThan(400);
    await hoverAt(page, await centerOf(words(page).first()));
    await page.setViewportSize({ width: 1000, height: 700 });
    await expect
      .poll(async () => (await wordCloud(page).locator("svg").boundingBox())?.height)
      .toBeLessThan((large?.height ?? 0) - 100);
    await expect(words(page)).toHaveCount(99);
  });

  test("words with equal counts all get the smallest size and the cloud still fills the pane", async ({
    page,
    api,
    seed,
  }) => {
    const queryId = await seedQuery(
      api,
      seed.dataSources.postgres,
      uniqueName("V words same"),
      "select name as word, 5 as freq from cities"
    );
    await openSourcePage(page, queryId);
    await newVisualization(page, "WORD_CLOUD", "Words same");
    await choose(page, "WordCloud.WordsColumn", "WordCloud.WordsColumn.word");
    await choose(page, "WordCloud.FrequenciesColumn", "WordCloud.FrequenciesColumn.freq");
    await expect(words(preview(page))).toHaveCount(12);
    expect(new Set((await sized(preview(page))).map((item) => item.size))).toEqual(new Set([10]));
    const saved = await saveVisualization(page);

    await openViewPage(page, queryId, saved.id);
    await expect(words(page)).toHaveCount(12);
    expect(new Set((await sized(page)).map((item) => item.size))).toEqual(new Set([10]));
    expect((await sized(page)).map((item) => item.word)).toEqual(
      expect.arrayContaining(["Sao Paulo", "Tel Aviv", "Toronto", "Nairobi"])
    );
    // 10px in the drawing, but the drawing is scaled up to the pane: the words are much bigger on screen
    const svg = await wordCloud(page).locator("svg").boundingBox();
    expect(svg?.height).toBeGreaterThan(400);
    const onScreen = await words(page).evaluateAll((texts) =>
      Math.min(...texts.map((text) => text.getBoundingClientRect().height))
    );
    expect(onScreen).toBeGreaterThan(20);
  });
});
