import { expect, test, uniqueName } from "../../support/fixtures";
import { createVisualizationViaApi } from "../../support/ui";
import { openViewPage, SLOW_INSTANCE_TIMEOUT, seedQuery } from "./helpers";

test.describe.configure({ timeout: SLOW_INSTANCE_TIMEOUT });

// Eleven journeys through up to five stages (null = the journey ended)
const SQL = `
  SELECT 'a' AS s1, 'a1' AS s2, 'a2' AS s3, null AS s4, null AS s5, 11 AS value UNION ALL
  SELECT 'a' AS s1, 'a2' AS s2, null AS s3, null AS s4, null AS s5, 12 AS value UNION ALL
  SELECT 'a' AS s1, 'a3' AS s2, null AS s3, null AS s4, null AS s5, 45 AS value UNION ALL
  SELECT 'a' AS s1, 'a4' AS s2, null AS s3, null AS s4, null AS s5, 54 AS value UNION ALL
  SELECT 'b' AS s1, 'b1' AS s2, 'a2' AS s3, 'c1' AS s4, null AS s5, 33 AS value UNION ALL
  SELECT 'b' AS s1, 'b2' AS s2, 'a4' AS s3, 'c3' AS s4, null AS s5, 73 AS value UNION ALL
  SELECT 'b' AS s1, 'b3' AS s2, null AS s3, null AS s4, null AS s5, 90 AS value UNION ALL
  SELECT 'c' AS s1, 'c1' AS s2, null AS s3, null AS s4, null AS s5, 19 AS value UNION ALL
  SELECT 'c' AS s1, 'c2' AS s2, 'b2' AS s3, 'a2' AS s4, 'a3' AS s5, 92 AS value UNION ALL
  SELECT 'c' AS s1, 'c3' AS s2, 'c4' AS s3, null AS s4, null AS s5, 63 AS value UNION ALL
  SELECT 'c' AS s1, 'c4' AS s2, null AS s3, null AS s4, null AS s5, 44 AS value`;

const COLUMNS = ["s1", "s2", "s3", "s4", "s5"];

// What the data draws with 1..5 stage columns.
//
// Sunburst: one arc per distinct path from the first stage (plus the hidden root), so the number of arcs in ring N
// is the number of distinct paths of N stages. Sankey: one node per distinct (stage, name) - the same name in two
// stages is two nodes - and one link per distinct pair of consecutive nodes; the "Exit" nodes and the links that
// lead to them are not drawn.
const EXPECTED = [
  {
    stages: 1,
    rings: [3],
    nodes: ["a", "b", "c"],
    links: 0,
  },
  {
    stages: 2,
    rings: [3, 11],
    nodes: ["a", "a1", "a2", "a3", "a4", "b", "b1", "b2", "b3", "c", "c1", "c2", "c3", "c4"],
    links: 11,
  },
  {
    stages: 3,
    rings: [3, 11, 5],
    nodes: ["a", "a1", "a2", "a2", "a3", "a4", "a4", "b", "b1", "b2", "b2", "b3", "c", "c1", "c2", "c3", "c4", "c4"],
    links: 16,
  },
  {
    stages: 4,
    rings: [3, 11, 5, 3],
    nodes: [
      "a",
      "a1",
      "a2",
      "a2",
      "a2",
      "a3",
      "a4",
      "a4",
      "b",
      "b1",
      "b2",
      "b2",
      "b3",
      "c",
      "c1",
      "c1",
      "c2",
      "c3",
      "c3",
      "c4",
      "c4",
    ],
    links: 19,
  },
  {
    stages: 5,
    rings: [3, 11, 5, 3, 1],
    nodes: [
      "a",
      "a1",
      "a2",
      "a2",
      "a2",
      "a3",
      "a3",
      "a4",
      "a4",
      "b",
      "b1",
      "b2",
      "b2",
      "b3",
      "c",
      "c1",
      "c1",
      "c2",
      "c3",
      "c3",
      "c4",
      "c4",
    ],
    links: 20,
  },
];

for (const kind of ["Sunburst", "Sankey"] as const) {
  test.describe(`${kind} visualization with 1 to 5 stage columns`, () => {
    for (const expected of EXPECTED) {
      test(`${expected.stages} stage column${expected.stages > 1 ? "s" : ""} draw${expected.stages > 1 ? "" : "s"} the ${
        kind === "Sunburst" ? "arcs" : "nodes and links"
      } of the data`, async ({ page, api, seed }) => {
        const columns = COLUMNS.slice(0, expected.stages).join(", ");
        const queryId = await seedQuery(
          api,
          seed.dataSources.postgres,
          uniqueName(`V ${kind.toLowerCase()} ${expected.stages} stages`),
          `SELECT ${columns}, value FROM (${SQL}) q`
        );
        const id = await createVisualizationViaApi(api, queryId, {
          type: kind === "Sunburst" ? "SUNBURST_SEQUENCE" : "SANKEY",
          name: kind,
        });
        await openViewPage(page, queryId, id);

        if (kind === "Sunburst") {
          const container = page.locator(".sunburst-visualization-container").first();
          const arcs = container.locator(".sunburst-container svg path.nodePath");
          // The root (ring 0, hidden) plus the arcs of every ring
          await expect(arcs).toHaveCount(1 + expected.rings.reduce((sum, count) => sum + count, 0));
          const perRing = await arcs.evaluateAll((paths) => {
            const counts: number[] = [];
            for (const path of paths) {
              const depth = (path as unknown as { __data__: { depth: number } }).__data__.depth;
              counts[depth] = (counts[depth] || 0) + 1;
            }
            return counts;
          });
          expect(perRing).toEqual([1, ...expected.rings]);
          expect(await container.innerHTML()).not.toContain("NaN");
        } else {
          const container = page.locator(".sankey-visualization-container").first();
          const nodes = container.locator("svg .node");
          await expect(nodes).toHaveCount(expected.nodes.length);
          await expect(container.locator("svg .link")).toHaveCount(expected.links);
          const labels = await nodes.evaluateAll((list) =>
            list.map((node) => node.querySelector("text")?.textContent || "").sort()
          );
          expect(labels).toEqual(expected.nodes);
          expect(await container.innerHTML()).not.toContain("NaN");
        }
      });
    }
  });
}
