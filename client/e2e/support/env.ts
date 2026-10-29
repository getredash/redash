import path from "path";

/** Settings of the end-to-end tests. Everything can be overridden with environment variables; see README.md. */
const env = process.env;

export const BASE_URL = env.E2E_BASE_URL || "http://localhost:5000";

/** The admin. On a fresh instance the first-run test creates this user through the setup page. */
export const ADMIN = {
  name: "E2E Admin",
  email: env.E2E_EMAIL || "admin@redash.io",
  password: env.E2E_PASSWORD || "password",
};

/** A second user in a group with view-only access to the PostgreSQL data source; created by the setup project. */
export const VIEWER = {
  name: "E2E Viewer",
  email: env.E2E_VIEWER_EMAIL || "e2e-viewer@example.com",
  password: env.E2E_VIEWER_PASSWORD || "e2e-viewer-password",
  group: "E2E viewers",
};

/** Services of `.ci/compose.e2e.yaml` as Redash (inside the Docker network) reaches them. */
export const INTERNAL = {
  postgres: { host: env.E2E_POSTGRES_HOST || "e2e-postgres", port: 5432, user: "demo", password: "demo", db: "demo" },
  mysql: { host: env.E2E_MYSQL_HOST || "e2e-mysql", port: 3306, user: "demo", password: "demo", db: "demo" },
  http: env.E2E_HTTP_INTERNAL_URL || "http://e2e-http:8000",
};

/** The same services as the test runner (on the host) reaches them. */
export const MAIL_URL = env.E2E_MAIL_URL || "http://localhost:1080";
export const HTTP_FIXTURE_URL = env.E2E_HTTP_URL || "http://localhost:8000";

/** A public URL serving JSON and CSV; Redash refuses private addresses, so these two tests need the internet. */
export const PUBLIC_JSON_URL = env.E2E_PUBLIC_JSON_URL || "https://jsonplaceholder.typicode.com/users";
export const PUBLIC_CSV_URL =
  env.E2E_PUBLIC_CSV_URL || "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/iris.csv";

/** Data sources created by the setup project. Tests must not edit or delete them. */
export const DATA_SOURCES = {
  postgres: "E2E PostgreSQL",
  mysql: "E2E MySQL",
  queryResults: "E2E Query Results",
  json: "E2E JSON",
  csv: "E2E CSV",
} as const;

export const RESULTS_DIR = path.join(__dirname, "..", ".results");
export const ADMIN_STATE = path.join(RESULTS_DIR, "admin-state.json");
export const VIEWER_STATE = path.join(RESULTS_DIR, "viewer-state.json");
export const MANIFEST_PATH = path.join(RESULTS_DIR, "manifest.json");
export const FRESH_INSTANCE_MARKER = path.join(RESULTS_DIR, "fresh-instance");

/** Keyboard modifier for shortcuts such as "select all". */
export const MOD = process.platform === "darwin" ? "Meta" : "Control";
