import { expect, Locator, Page, test } from "@playwright/test";
import { readPagesManifest } from "./manifest";
import { stabilizePage, waitForPageReady } from "./stable-page";

interface PageExample {
  name: string;
  /** URL path, or the name of a path in the pages manifest (objects created by pages.setup.ts) */
  path: string | { manifest: string };
  loggedOut?: boolean;
  /** Brings the page to the state to take a screenshot of, once it loaded (e.g. opens a dialog) */
  prepare?: (page: Page) => Promise<void>;
  /** Only the viewport, e.g. for dialogs (full-page screenshots don't move fixed elements along) */
  viewportOnly?: boolean;
  /** Content that differs between instances, e.g. absolute URLs of the server */
  mask?: (page: Page) => Locator[];
}

const waitForSchema = (page: Page) => expect(page.getByText("invoice_items")).toBeVisible();

async function openDialog(page: Page, testId: string) {
  await page.getByTestId(testId).click();
  await expect(page.locator(".ant-modal")).toBeVisible();
}

const PAGES: PageExample[] = [
  { name: "Login", path: "/login", loggedOut: true },
  { name: "Home", path: "/" },

  // Queries
  { name: "Queries: favorites", path: "/queries/favorites" },
  { name: "Query", path: { manifest: "query" } },
  { name: "Query: chart", path: { manifest: "queryChart" } },
  {
    name: "Query: actions menu",
    path: { manifest: "query" },
    prepare: async (page) => {
      await page.getByTestId("QueryControlDropdownButton").click();
      await expect(page.getByTestId("ShowEmbedDialogButton")).toBeVisible();
    },
  },
  {
    name: "Query: embed dialog",
    path: { manifest: "query" },
    viewportOnly: true,
    prepare: async (page) => {
      await page.getByTestId("QueryControlDropdownButton").click();
      await openDialog(page, "ShowEmbedDialogButton");
    },
    mask: (page) => [page.locator(".embed-query-dialog code")],
  },
  { name: "Query: editor", path: { manifest: "querySource" }, prepare: waitForSchema },
  {
    name: "Query: visualization editor",
    path: { manifest: "querySourceChart" },
    viewportOnly: true,
    prepare: async (page) => {
      await waitForSchema(page);
      await openDialog(page, "EditVisualization");
    },
  },
  { name: "New query", path: "/queries/new", prepare: waitForSchema },
  { name: "Query snippet", path: { manifest: "snippet" } },
  { name: "Embedded visualization", path: { manifest: "embed" }, loggedOut: true },

  // Dashboards
  { name: "Dashboards: favorites", path: "/dashboards/favorites" },
  { name: "Dashboard", path: { manifest: "dashboard" } },
  {
    name: "Dashboard: editing",
    path: { manifest: "dashboardEdit" },
    prepare: async (page) => {
      // Entering edit mode saves the layout after a 2 seconds debounce, showing "Saving" until then
      await page.clock.runFor(2_000);
      await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    },
  },
  {
    name: "Dashboard: share dialog",
    path: { manifest: "dashboard" },
    viewportOnly: true,
    prepare: (page) => openDialog(page, "OpenShareForm"),
  },

  // Alerts
  { name: "Alerts", path: "/alerts" },
  { name: "Alert", path: { manifest: "alert" } },
  { name: "Alert: editing", path: { manifest: "alertEdit" } },
  { name: "New alert", path: "/alerts/new" },

  // Users and groups
  { name: "Users", path: "/users" },
  { name: "Users: pending invitations", path: "/users/pending" },
  { name: "Users: disabled", path: "/users/disabled" },
  { name: "User profile: own", path: { manifest: "profile" } },
  { name: "User profile: other user", path: { manifest: "user" } },
  { name: "Groups", path: "/groups" },
  { name: "Group: members", path: { manifest: "group" } },
  { name: "Group: data sources", path: { manifest: "groupDataSources" } },

  // Settings
  { name: "Data sources", path: "/data_sources" },
  { name: "New data source", path: "/data_sources/new", viewportOnly: true },
  { name: "Data source", path: { manifest: "dataSource" } },
  { name: "Alert destinations", path: "/destinations" },
  { name: "New alert destination", path: "/destinations/new", viewportOnly: true },
  { name: "Alert destination", path: { manifest: "destination" } },
  { name: "Query snippets", path: "/query_snippets" },
  { name: "Organization settings", path: "/settings/general" },

  { name: "Page not found", path: "/this-page-does-not-exist" },
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const baselineNames = PAGES.map((example) => slugify(example.name));
if (new Set(baselineNames).size !== baselineNames.length) {
  throw new Error(`Page names must be unique after slugifying: ${baselineNames}`);
}

test.beforeEach(async ({ page }) => {
  await stabilizePage(page);
});

test.afterEach(async ({ page }) => {
  // Requests still running when the test ends (e.g. polling) can't be fulfilled anymore
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

for (const example of PAGES) {
  test.describe(() => {
    if (example.loggedOut) {
      test.use({ storageState: { cookies: [], origins: [] } });
    }

    test(example.name, async ({ page }) => {
      const path = typeof example.path === "string" ? example.path : readPagesManifest().paths[example.path.manifest];
      if (!path) {
        throw new Error(`No "${JSON.stringify(example.path)}" path in the pages manifest`);
      }

      await page.goto(path);
      await waitForPageReady(page);
      if (example.prepare) {
        await example.prepare(page);
        await waitForPageReady(page);
      }
      await expect(page).toHaveScreenshot(["pages", `${slugify(example.name)}.png`], {
        fullPage: !example.viewportOnly,
        mask: example.mask?.(page),
      });
    });
  });
}
