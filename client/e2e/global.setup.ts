import fs from "fs";
import path from "path";
import { test as setup } from "@playwright/test";
import { RedashApi } from "../visual-tests/api";
import { ADMIN, ADMIN_STATE, DATA_SOURCES, INTERNAL, MANIFEST_PATH, VIEWER, VIEWER_STATE } from "./support/env";
import type { Manifest } from "./support/fixtures";

interface DataSource {
  id: number;
  name: string;
}

/**
 * Prepares what every test may rely on, through the API: the data sources, the limited user and its group,
 * and saved browser sessions for the admin and the limited user. Safe to run again on the same instance.
 */
setup("prepare data sources, the limited user and browser sessions", async ({ baseURL }) => {
  setup.setTimeout(5 * 60_000);
  const api = await RedashApi.login(baseURL, ADMIN);
  try {
    const types: { type: string }[] = await api.get("/api/data_sources/types");
    const hasType = (type: string) => types.some((t) => t.type === type);
    const { postgres, mysql } = INTERNAL;

    const pg = await upsertDataSource(api, DATA_SOURCES.postgres, "pg", {
      host: postgres.host,
      port: postgres.port,
      user: postgres.user,
      password: postgres.password,
      dbname: postgres.db,
    });
    await waitUntilReachable(api, pg);
    // The MySQL driver is not in every image (e.g. CI installs the "main" dependency group only)
    let mysqlId: number | null = null;
    if (hasType("mysql")) {
      const dataSource = await upsertDataSource(api, DATA_SOURCES.mysql, "mysql", {
        host: mysql.host,
        port: mysql.port,
        user: mysql.user,
        passwd: mysql.password,
        db: mysql.db,
      });
      await waitUntilReachable(api, dataSource);
      mysqlId = dataSource.id;
    }
    const queryResults = await upsertDataSource(api, DATA_SOURCES.queryResults, "results", {});
    const json = await upsertDataSource(api, DATA_SOURCES.json, "json", {});
    const csv = await upsertDataSource(api, DATA_SOURCES.csv, "csv", {});

    // The limited user: only in a group that may view (not query) the PostgreSQL data source
    const groups: { id: number; name: string }[] = await api.get("/api/groups");
    const group: { id: number } =
      groups.find((g) => g.name === VIEWER.group) || (await api.post("/api/groups", { name: VIEWER.group }));
    const groupSources: DataSource[] = await api.get(`/api/groups/${group.id}/data_sources`);
    if (!groupSources.some((ds) => ds.id === pg.id)) {
      await api.post(`/api/groups/${group.id}/data_sources`, { data_source_id: pg.id });
    }
    await api.post(`/api/groups/${group.id}/data_sources/${pg.id}`, { view_only: true });

    const found = await Promise.all(
      ([{}, { pending: "true" }, { disabled: "true" }] as Record<string, string>[]).map((filter) =>
        api.get("/api/users", { q: VIEWER.email, page_size: 250, ...filter })
      )
    );
    let viewer = found.flatMap((page) => page.results).find((user: { email: string }) => user.email === VIEWER.email);
    if (!viewer) {
      viewer = await api.post("/api/users?no_invite", { name: VIEWER.name, email: VIEWER.email });
      await api.acceptInvite(viewer.invite_link, VIEWER.password);
    }
    if (viewer.is_disabled) {
      await api.delete(`/api/users/${viewer.id}/disable`);
    }
    const defaultGroup = groups.find((g) => g.name === "default");
    const viewerGroups: number[] = (await api.get(`/api/users/${viewer.id}`)).groups;
    if (!viewerGroups.includes(group.id)) {
      await api.post(`/api/groups/${group.id}/members`, { user_id: viewer.id });
    }
    if (defaultGroup && viewerGroups.includes(defaultGroup.id)) {
      await api.delete(`/api/groups/${defaultGroup.id}/members/${viewer.id}`);
    }

    const admin = (await api.get("/api/session")).user;
    const manifest: Manifest = {
      adminId: admin.id,
      viewerId: viewer.id,
      viewerGroupId: group.id,
      dataSources: { postgres: pg.id, mysql: mysqlId, queryResults: queryResults.id, json: json.id, csv: csv.id },
    };
    fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    await api.saveStorageState(ADMIN_STATE);

    const viewerApi = await RedashApi.login(baseURL, VIEWER);
    await viewerApi.saveStorageState(VIEWER_STATE);
    await viewerApi.dispose();
  } finally {
    await api.dispose();
  }
});

async function upsertDataSource(api: RedashApi, name: string, type: string, options: Record<string, unknown>) {
  const existing = ((await api.get("/api/data_sources")) as DataSource[]).find((ds) => ds.name === name);
  if (existing) {
    return api.post(`/api/data_sources/${existing.id}`, { name, type, options }) as Promise<DataSource>;
  }
  return api.post("/api/data_sources", { name, type, options }) as Promise<DataSource>;
}

/** The demo databases may still be starting when the tests begin. */
async function waitUntilReachable(api: RedashApi, dataSource: DataSource) {
  const deadline = Date.now() + 120_000;
  let result: { ok: boolean; message: string } = { ok: false, message: "" };
  while (Date.now() < deadline) {
    result = await api.post(`/api/data_sources/${dataSource.id}/test`);
    if (result.ok) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error(
    `Data source "${dataSource.name}" is not reachable from Redash: ${result.message}. ` +
      "Are the services of .ci/compose.e2e.yaml running?"
  );
}
