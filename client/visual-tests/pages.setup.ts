import { test as setup } from "@playwright/test";
import { RedashApi } from "./api";
import { DATA_SOURCE_NAME, PAGES_TAG, STORAGE_STATE_PATH, writePagesManifest } from "./manifest";

const PREFIX = "Page Examples: ";

const USERS = {
  active: { name: "Jane Analyst", email: "jane.analyst@example.com" },
  pending: { name: "Sam Invited", email: "sam.invited@example.com" },
  disabled: { name: "Alex Former", email: "alex.former@example.com" },
};

const TOP_CUSTOMERS = `
SELECT
    c.FirstName || ' ' || c.LastName AS customer,
    c.Country AS country,
    COUNT(DISTINCT i.InvoiceId) AS invoices,
    ROUND(SUM(i.Total), 2) AS revenue
FROM customers c
JOIN invoices i ON i.CustomerId = c.CustomerId
WHERE i.InvoiceDate BETWEEN '{{ period.start }}' AND '{{ period.end }} 23:59:59'
  AND ('{{ country }}' = 'All' OR c.Country = '{{ country }}')
GROUP BY 1, 2
ORDER BY revenue DESC, customer
LIMIT {{ limit }}
`;

const TOP_CUSTOMERS_PARAMETERS = [
  {
    name: "period",
    title: "Period",
    type: "date-range",
    value: { start: "2012-01-01", end: "2012-12-31" },
  },
  {
    name: "country",
    title: "Country",
    type: "enum",
    enumOptions: "All\nUSA\nCanada\nFrance\nBrazil\nGermany",
    value: "All",
  },
  { name: "limit", title: "Limit", type: "number", value: 10 },
];

const INVOICES_BY_COUNTRY = `
SELECT
    BillingCountry AS country,
    COUNT(*) AS invoices,
    ROUND(SUM(Total), 2) AS revenue
FROM invoices
GROUP BY 1
ORDER BY revenue DESC, country
`;

const DASHBOARD_TEXT = `
## Sales overview

Revenue and top customers of the **Chinook** music store. The queries are in [favorites](queries/favorites).

- Amounts are in USD
- \`revenue\` is the sum of the invoice totals
`;

/**
 * Loads the objects shown by the page tests (users, a group, data sources, destinations, queries, an alert, a
 * dashboard...) through the API and saves the admin's session for the browser. Needs to log in with an email and
 * password (not an API key), and a fresh instance: page screenshots show everything on the instance.
 *
 * Objects from a previous run are removed first (users can't be deleted, so they are reused).
 */
setup("load page examples", async ({ baseURL }) => {
  setup.setTimeout(5 * 60_000);
  const api = await RedashApi.login(baseURL);

  try {
    await removeExamples(api);
    const paths: Record<string, string> = {};

    const { user: admin } = await api.get("/api/session");
    paths.profile = `/users/${admin.id}`;

    // Users
    const jane = await upsertUser(api, USERS.active, "active");
    await upsertUser(api, USERS.pending, "pending");
    await upsertUser(api, USERS.disabled, "disabled");
    paths.user = `/users/${jane.id}`;

    // Data sources
    const chinook = (await api.get("/api/data_sources")).find((ds: { name: string }) => ds.name === DATA_SOURCE_NAME);
    if (!chinook) {
      throw new Error(`Data source "${DATA_SOURCE_NAME}" not found - run the "seed" project first.`);
    }
    const postgres = await api.post("/api/data_sources", {
      name: `${PREFIX}PostgreSQL`,
      type: "pg",
      options: { host: "db.example.com", port: 5432, user: "analyst", dbname: "analytics" },
    });
    paths.dataSource = `/data_sources/${postgres.id}`;

    // Group with members and data sources
    const group = await api.post("/api/groups", { name: `${PREFIX}Analysts` });
    await api.post(`/api/groups/${group.id}/members`, { user_id: admin.id });
    await api.post(`/api/groups/${group.id}/members`, { user_id: jane.id });
    await api.post(`/api/groups/${group.id}/data_sources`, { data_source_id: chinook.id });
    await api.post(`/api/groups/${group.id}/data_sources`, { data_source_id: postgres.id });
    await api.post(`/api/groups/${group.id}/data_sources/${postgres.id}`, { view_only: true });
    paths.group = `/groups/${group.id}`;
    paths.groupDataSources = `/groups/${group.id}/data_sources`;

    // Alert destinations
    const email = await api.post("/api/destinations", {
      name: `${PREFIX}Team email`,
      type: "email",
      options: { addresses: "team@example.com" },
    });
    await api.post("/api/destinations", {
      name: `${PREFIX}Ops Slack`,
      type: "slack",
      options: { url: "https://hooks.slack.com/services/T000/B000/XXXX" },
    });
    paths.destination = `/destinations/${email.id}`;

    // Queries
    const topCustomers = await createQuery(api, chinook.id, {
      name: `${PREFIX}Top customers`,
      description: "Customers with the highest revenue in a period.",
      query: TOP_CUSTOMERS,
      parameters: TOP_CUSTOMERS_PARAMETERS,
    });
    const topCustomersChart = await api.post("/api/visualizations", {
      query_id: topCustomers.id,
      type: "CHART",
      name: "Revenue by customer",
      description: "",
      options: {
        globalSeriesType: "column",
        columnMapping: { customer: "x", revenue: "y" },
        legend: { enabled: false },
      },
    });
    await api.post(`/api/queries/${topCustomers.id}/favorite`);
    paths.query = `/queries/${topCustomers.id}`;
    paths.queryChart = `/queries/${topCustomers.id}#${topCustomersChart.id}`;
    paths.querySource = `/queries/${topCustomers.id}/source`;
    paths.querySourceChart = `/queries/${topCustomers.id}/source#${topCustomersChart.id}`;

    const invoicesByCountry = await createQuery(api, chinook.id, {
      name: `${PREFIX}Invoices by country`,
      description: "",
      query: INVOICES_BY_COUNTRY,
      parameters: [],
    });
    const countriesCounter = await api.post("/api/visualizations", {
      query_id: invoicesByCountry.id,
      type: "COUNTER",
      name: "Countries",
      description: "",
      options: { counterLabel: "Countries", countRow: true },
    });
    const revenueByCountry = await api.post("/api/visualizations", {
      query_id: invoicesByCountry.id,
      type: "CHART",
      name: "Revenue by country",
      description: "",
      options: {
        globalSeriesType: "pie",
        columnMapping: { country: "x", revenue: "y" },
      },
    });
    await api.post(`/api/queries/${invoicesByCountry.id}/favorite`);
    paths.embed =
      `/embed/query/${invoicesByCountry.id}/visualization/${revenueByCountry.id}` +
      `?api_key=${invoicesByCountry.api_key}`;

    // Alert (created after the query ran, so its state stays "unknown")
    const alert = await api.post("/api/alerts", {
      name: `${PREFIX}Revenue above 400`,
      query_id: invoicesByCountry.id,
      options: {
        column: "revenue",
        op: ">",
        value: 400,
        custom_subject: "{{ ALERT_NAME }} changed to {{ ALERT_STATUS }}",
        custom_body: "Top country revenue: {{ QUERY_RESULT_VALUE }}\n\n{{ QUERY_URL }}",
      },
      rearm: 3600,
    });
    await api.post(`/api/alerts/${alert.id}/subscriptions`, { destination_id: email.id });
    paths.alert = `/alerts/${alert.id}`;
    paths.alertEdit = `/alerts/${alert.id}/edit`;

    // Query snippet
    const snippet = await api.post("/api/query_snippets", {
      trigger: "pe-customers",
      description: `${PREFIX}Customers with their invoices`,
      snippet: "SELECT *\nFROM customers c\nJOIN invoices i ON i.CustomerId = c.CustomerId",
    });
    paths.snippet = `/query_snippets/${snippet.id}`;

    // Dashboard with a text widget, dashboard-level parameters and visualizations
    const dashboard = await api.post("/api/dashboards", { name: `${PREFIX}Sales overview` });
    const parameterMappings = Object.fromEntries(
      TOP_CUSTOMERS_PARAMETERS.map(({ name }) => [
        name,
        { name, type: "dashboard-level", mapTo: name, value: null, title: "" },
      ])
    );
    const topCustomersTable = topCustomers.visualizations.find((viz: { type: string }) => viz.type === "TABLE");
    const widgets = [
      { text: DASHBOARD_TEXT, position: { col: 0, row: 0, sizeX: 3, sizeY: 5 } },
      { visualization_id: countriesCounter.id, position: { col: 3, row: 0, sizeX: 3, sizeY: 5 } },
      { visualization_id: revenueByCountry.id, position: { col: 6, row: 0, sizeX: 6, sizeY: 10 } },
      {
        visualization_id: topCustomersChart.id,
        position: { col: 0, row: 5, sizeX: 6, sizeY: 9 },
        parameterMappings,
      },
      {
        visualization_id: topCustomersTable.id,
        position: { col: 0, row: 14, sizeX: 12, sizeY: 10 },
        parameterMappings,
      },
    ];
    for (const { text = "", visualization_id = null, position, parameterMappings = {} } of widgets) {
      await api.post("/api/widgets", {
        dashboard_id: dashboard.id,
        visualization_id,
        text: text.trim(),
        width: 1,
        options: { isHidden: false, parameterMappings, position: { ...position, autoHeight: false } },
      });
    }
    const { version } = await api.get(`/api/dashboards/${dashboard.id}`);
    await api.post(`/api/dashboards/${dashboard.id}`, { is_draft: false, tags: [PAGES_TAG], version });
    await api.post(`/api/dashboards/${dashboard.id}/favorite`);
    paths.dashboard = `/dashboards/${dashboard.id}`;
    paths.dashboardEdit = `/dashboards/${dashboard.id}?edit`;

    writePagesManifest({ paths });
    await api.saveStorageState(STORAGE_STATE_PATH);
  } finally {
    await api.dispose();
  }
});

async function removeExamples(api: RedashApi) {
  const isExample = ({ name }: { name: string }) => name.startsWith(PREFIX);

  const dashboards = await api.get("/api/dashboards", { tags: PAGES_TAG, page_size: 250 });
  for (const dashboard of dashboards.results.filter(isExample)) {
    await api.delete(`/api/dashboards/${dashboard.id}`);
  }
  // Archiving a query also removes its alerts
  const queries = await api.get("/api/queries", { tags: PAGES_TAG, page_size: 250 });
  for (const query of queries.results.filter(isExample)) {
    await api.delete(`/api/queries/${query.id}`);
  }
  for (const snippet of await api.get("/api/query_snippets")) {
    if (snippet.description.startsWith(PREFIX)) {
      await api.delete(`/api/query_snippets/${snippet.id}`);
    }
  }
  for (const destination of (await api.get("/api/destinations")).filter(isExample)) {
    await api.delete(`/api/destinations/${destination.id}`);
  }
  for (const group of (await api.get("/api/groups")).filter(isExample)) {
    await api.delete(`/api/groups/${group.id}`);
  }
  for (const dataSource of (await api.get("/api/data_sources")).filter(isExample)) {
    await api.delete(`/api/data_sources/${dataSource.id}`);
  }
}

/** Finds or creates (invites) a user, then brings it to the given state. */
async function upsertUser(
  api: RedashApi,
  { name, email }: { name: string; email: string },
  state: "active" | "pending" | "disabled"
) {
  const lists = await Promise.all(
    ([{}, { pending: "true" }, { disabled: "true" }] as Record<string, string>[]).map((filter) =>
      api.get("/api/users", { q: email, page_size: 250, ...filter })
    )
  );
  let user = lists.flatMap((list) => list.results).find((u: { email: string }) => u.email === email);
  if (!user) {
    // `no_invite`: don't email the invitation, return its link instead
    user = await api.post("/api/users?no_invite", { name, email });
    if (state !== "pending") {
      await api.acceptInvite(user.invite_link, "password");
    }
  }
  if (state === "disabled" && !user.is_disabled) {
    await api.post(`/api/users/${user.id}/disable`);
  }
  return user;
}

async function createQuery(
  api: RedashApi,
  dataSourceId: number,
  example: { name: string; description: string; query: string; parameters: { name: string; value: unknown }[] }
) {
  const query = await api.post("/api/queries", {
    name: example.name,
    description: example.description,
    query: example.query.trim(),
    data_source_id: dataSourceId,
    options: { parameters: example.parameters },
    schedule: null,
    tags: [PAGES_TAG],
  });
  await api.post(`/api/queries/${query.id}`, { is_draft: false, version: query.version });

  // Execute with the default parameter values, so pages show cached results
  const parameters = Object.fromEntries(example.parameters.map(({ name, value }) => [name, value]));
  const response = await api.post(`/api/queries/${query.id}/results`, { parameters, max_age: 0 });
  await api.waitForExecution(response, example.name);
  return api.get(`/api/queries/${query.id}`);
}
