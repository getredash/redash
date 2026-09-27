import { test as setup } from "@playwright/test";
import { RedashApi } from "./api";
import { DASHBOARDS, DEFAULT_WIDGET_SIZE, EXAMPLES, QueryExample, VisualizationType } from "./examples";
import { DASHBOARD_PREFIX, DATA_SOURCE_NAME, Manifest, TAG, writeManifest } from "./manifest";

// Path to the SQLite file as seen by the Redash server and workers (the repository is mounted at /app)
const DB_PATH = process.env.VISUAL_TESTS_DB_PATH || "/app/client/visual-tests/fixtures/chinook.db";
const GRID_COLUMNS = 12;
const QUERY_TIMEOUT = 120_000;

/**
 * Loads the examples through the API: a SQLite data source, one query per entry in EXAMPLES (executed, so
 * results are ready), its visualizations, and one publicly shared dashboard per visualization type.
 * Examples loaded by a previous run are archived first.
 */
setup("load visualization examples", async ({ baseURL }) => {
  setup.setTimeout(10 * 60_000);
  const api = await RedashApi.connect(baseURL);

  try {
    await removeExamples(api);
    const dataSourceId = await upsertDataSource(api);

    const queries = await mapWithConcurrency(EXAMPLES, 4, async (example) => {
      const query = await createQuery(api, example, dataSourceId);
      const visualizations: Record<string, number> = {};
      for (const viz of example.visualizations) {
        const { id } = await api.post("/api/visualizations", {
          query_id: query.id,
          type: viz.type,
          name: viz.name,
          description: "",
          options: viz.options,
        });
        visualizations[viz.name] = id;
      }
      return visualizations;
    });

    const manifest: Manifest = { dashboards: {} };
    for (const type of Object.keys(DASHBOARDS) as VisualizationType[]) {
      manifest.dashboards[type] = await createDashboard(api, type, queries);
    }
    writeManifest(manifest);
  } finally {
    await api.dispose();
  }
});

async function removeExamples(api: RedashApi) {
  const dashboards = await api.get("/api/dashboards", { tags: TAG, page_size: 250 });
  for (const { id } of dashboards.results) {
    await api.delete(`/api/dashboards/${id}/share`);
    await api.delete(`/api/dashboards/${id}`);
  }
  const queries = await api.get("/api/queries", { tags: TAG, page_size: 250 });
  for (const { id } of queries.results) {
    await api.delete(`/api/queries/${id}`);
  }
}

async function upsertDataSource(api: RedashApi): Promise<number> {
  const definition = { name: DATA_SOURCE_NAME, type: "sqlite", options: { dbpath: DB_PATH } };
  const existing = (await api.get("/api/data_sources")).find(
    (dataSource: { name: string }) => dataSource.name === DATA_SOURCE_NAME
  );
  if (existing) {
    await api.post(`/api/data_sources/${existing.id}`, definition);
    return existing.id;
  }
  return (await api.post("/api/data_sources", definition)).id;
}

async function createQuery(api: RedashApi, example: QueryExample, dataSourceId: number) {
  const queryText = example.query.trim();
  const query = await api.post("/api/queries", {
    name: example.name,
    description: example.description,
    query: queryText,
    data_source_id: dataSourceId,
    options: { parameters: [] },
    schedule: null,
  });
  await api.post(`/api/queries/${query.id}`, { is_draft: false, tags: [TAG], version: query.version });

  const response = await api.post("/api/query_results", {
    query_id: query.id,
    data_source_id: dataSourceId,
    query: queryText,
    parameters: {},
    max_age: 0,
  });
  let job = response.job;
  const deadline = Date.now() + QUERY_TIMEOUT;
  while (job && job.status < 3) {
    if (Date.now() > deadline) {
      throw new Error(`Query "${example.name}" did not finish in time - is a Redash worker running?`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    job = (await api.get(`/api/jobs/${job.id}`)).job;
  }
  if (job && job.status !== 3) {
    throw new Error(`Query "${example.name}" failed: ${job.error}`);
  }
  return query;
}

async function createDashboard(api: RedashApi, type: VisualizationType, queries: Record<string, number>[]) {
  const dashboard = await api.post("/api/dashboards", { name: DASHBOARD_PREFIX + DASHBOARDS[type] });
  const widgets: Record<string, number> = {};

  // Place widgets left to right, wrapping to a new row when the grid is full
  let col = 0;
  let row = 0;
  let rowHeight = 0;
  for (const [index, example] of EXAMPLES.entries()) {
    for (const viz of example.visualizations.filter((v) => v.type === type)) {
      const [sizeX, sizeY] = viz.size || DEFAULT_WIDGET_SIZE[type];
      if (col + sizeX > GRID_COLUMNS) {
        col = 0;
        row += rowHeight;
        rowHeight = 0;
      }
      const widget = await api.post("/api/widgets", {
        dashboard_id: dashboard.id,
        visualization_id: queries[index][viz.name],
        text: "",
        width: 1,
        options: {
          isHidden: false,
          parameterMappings: {},
          position: { col, row, sizeX, sizeY, autoHeight: false },
        },
      });
      widgets[viz.name] = widget.id;
      col += sizeX;
      rowHeight = Math.max(rowHeight, sizeY);
    }
  }

  const { version } = await api.get(`/api/dashboards/${dashboard.id}`);
  await api.post(`/api/dashboards/${dashboard.id}`, { is_draft: false, tags: [TAG], version });
  const { public_url: publicUrl } = await api.post(`/api/dashboards/${dashboard.id}/share`);

  // Only the path: the server's own idea of its host isn't necessarily reachable from the test browser
  return { id: dashboard.id, publicPath: new URL(publicUrl, "http://localhost").pathname, widgets };
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}
