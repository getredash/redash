import { expect, type RedashApi, test, uniqueName } from "../../support/fixtures";
import { createQueryViaApi } from "../../support/ui";
import {
  apply,
  choose,
  expectFirstRow,
  expectPending,
  field,
  openDynamicMenu,
  openSource,
  parameter,
  quoted,
  resultRows,
  rowsOf,
  runError,
  shown,
  tags,
  typeRange,
  typeValue,
} from "./helpers";

/** Wednesday 14 October 2026, 10:30:15 in the browser's time zone (Asia/Jerusalem, UTC+3 on that day). */
const NOW = new Date("2026-10-14T10:30:15+03:00");

const DIALECTS = {
  mysql: {
    label: "MySQL",
    dayAfter: (date: string) => `date_add('${date}', interval 1 day)`,
    syntaxError: /Error running query:.*You have an error in your SQL syntax/s,
  },
  postgres: {
    label: "PostgreSQL",
    dayAfter: (date: string) => `('${date}'::date + 1)`,
    syntaxError: /Error running query: syntax error at or near.*'it's' as cat/s,
  },
} as const;

type Dialect = keyof typeof DIALECTS;

const parameterisedSql = (
  dialect: Dialect
) => `select count(*) as n, sum(quantity) as qty, '{{ cat }}' as cat, {{ minq }} as minq, '[{{ day }}]' as day, '[{{ r.start }} {{ r.end }}]' as r
from orders where category = '{{ cat }}' and channel in ({{ channels }}) and quantity >= {{ minq }}
 and created_at >= '{{ r.start }}' and created_at < ${DIALECTS[dialect].dayAfter("{{ r.end }}")}`;

/** The same filter written out, for what the database answers without any parameter involved. */
async function literal(
  api: RedashApi,
  dataSourceId: number,
  dialect: Dialect,
  filter: { category: string; channels: string[]; minQuantity: number; start: string; end: string }
) {
  const [row] = await rowsOf(
    api,
    dataSourceId,
    `select count(*) as n, sum(quantity) as qty from orders where category = '${filter.category}'
     and channel in (${filter.channels.map((channel) => `'${channel}'`).join(",")}) and quantity >= ${filter.minQuantity}
     and created_at >= '${filter.start}' and created_at < ${DIALECTS[dialect].dayAfter(filter.end)}`
  );
  return { n: Number(row.n), qty: Number(row.qty) };
}

/** Count and quantity in the first row of the result table, as numbers ("1,234" and "279.00" included). */
async function shownTotals(page: Parameters<typeof resultRows>[0]) {
  const [row] = await resultRows(page);
  const number = (text: string | undefined) => (text ? Number(text.replace(/,/g, "")) : Number.NaN);
  return { n: number(row?.n), qty: number(row?.qty) };
}

for (const dialect of ["mysql", "postgres"] as const) {
  const { label, syntaxError } = DIALECTS[dialect];

  test(`${label}: text, number, date, date range and multi-value parameters filter like the same SQL written out`, async ({
    page,
    api,
    seed,
  }) => {
    test.skip(seed.dataSources[dialect] === null, "this server has no MySQL driver");
    const dataSourceId = seed.dataSources[dialect] as number;
    const { id } = await createQueryViaApi(api, {
      name: uniqueName(`P ${label}`),
      dataSourceId,
      sql: parameterisedSql(dialect),
      options: {
        parameters: [
          parameter({ name: "cat", value: "Training" }),
          parameter({
            name: "channels",
            type: "enum",
            enumOptions: "web\npartner\ndirect",
            multiValuesOptions: quoted("'"),
            value: ["partner"],
          }),
          parameter({ name: "minq", type: "number", value: 5 }),
          parameter({ name: "day", type: "date", value: "2026-02-14" }),
          parameter({ name: "r", type: "date-range", value: { start: "2026-01-01", end: "2026-01-31" } }),
        ],
      },
    });
    await page.clock.setFixedTime(NOW);
    const formats = await openSource(page, id);
    await expectFirstRow(page, { cat: "Training", minq: "5", day: "[2026-02-14]", r: "[2026-01-01 2026-01-31]" });

    // Every value changed by hand: Software, at least 2, web + direct (partner removed), February to April
    await typeValue(page, "cat", "Software");
    await typeValue(page, "minq", "2");
    await typeRange(page, "r", shown(formats, "2026-02-01"), shown(formats, "2026-04-30"));
    await tags(page, "channels").filter({ hasText: "partner" }).locator(".ant-select-selection-item-remove").click();
    await choose(page, "channels", "web", "direct");
    await expectPending(page, 4);
    await apply(page);
    await expectFirstRow(page, { cat: "Software", minq: "2", r: "[2026-02-01 2026-04-30]" });
    const first = await literal(api, dataSourceId, dialect, {
      category: "Software",
      channels: ["web", "direct"],
      minQuantity: 2,
      start: "2026-02-01",
      end: "2026-04-30",
    });
    expect(first.n, "the control query finds orders").toBeGreaterThan(0);
    expect(await shownTotals(page)).toEqual(first);

    // Dynamic values: last month (September 2026) and yesterday
    await typeValue(page, "cat", "Hardware");
    await typeValue(page, "minq", "1");
    const rangeMenu = await openDynamicMenu(page, "r");
    await rangeMenu
      .locator("li")
      .filter({ hasText: /^Last month/ })
      .click();
    const dayMenu = await openDynamicMenu(page, "day");
    await dayMenu
      .locator("li")
      .filter({ hasText: /^Yesterday/ })
      .click();
    await apply(page);
    await expectFirstRow(page, { cat: "Hardware", minq: "1", day: "[2026-10-13]", r: "[2026-09-01 2026-09-30]" });
    const second = await literal(api, dataSourceId, dialect, {
      category: "Hardware",
      channels: ["web", "direct"],
      minQuantity: 1,
      start: "2026-09-01",
      end: "2026-09-30",
    });
    expect(second.n, "the control query finds orders").toBeGreaterThan(0);
    expect(await shownTotals(page)).toEqual(second);

    // A quote in a text value breaks the SQL and the database's own message is shown
    await typeValue(page, "cat", "it's");
    await apply(page);
    await expect(runError(page)).toContainText(syntaxError);
    await typeValue(page, "cat", "Hardware");
    await apply(page);
    await expectFirstRow(page, { cat: "Hardware", minq: "1" });
    await expect(runError(page)).toHaveCount(0);
    await expect(field(page, "cat")).toHaveValue("Hardware");
  });
}
