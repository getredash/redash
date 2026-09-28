import { Page, Request } from "@playwright/test";

/** The browser's current time: with the timestamps below, dates and "x hours ago" are the same on every run. */
const NOW = new Date("2026-01-15T12:00:00Z");
const TIMESTAMP = "2026-01-15T09:30:00Z";
const API_KEY = "VisualTestsApiKeyVisualTestsApiKey000000";
const RUNTIME = 0.25;

// Which data source types a server offers depends on the Python packages it has installed (CI only installs the
// main dependencies), so data source type lists only show these, available everywhere.
const DATA_SOURCE_TYPES = ["graphite", "pg", "prometheus", "results", "sqlite"];

const READY_TIMEOUT = 30_000;
const API_IDLE_TIME = 500;

// Spinners and placeholders shown while a page loads its data
const LOADING = ".fa-spinner, .zmdi-hc-spin, .ant-spin-spinning, .ant-skeleton";

// Elements in the middle of an antd (rc-motion) transition, e.g. a menu opening
const MOTION = '[class*="-enter"], [class*="-appear"], [class*="-leave"]';

// Profile pictures come from Gravatar; serve a plain gray square instead.
const AVATAR = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGN48eIFAAV0ArnZwsdlAAAAAElFTkSuQmCC",
  "base64"
);

/** Replaces values that change between runs and instances in an API response. */
function stabilize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stabilize);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, field]) => {
        if (key === "rows") {
          return [key, field]; // query results data
        }
        if (key.endsWith("_at") && typeof field === "string") {
          return [key, TIMESTAMP];
        }
        if (key === "runtime" && typeof field === "number") {
          return [key, RUNTIME];
        }
        if (key === "api_key" && typeof field === "string") {
          return [key, API_KEY];
        }
        if (key === "groups" && Array.isArray(field) && field.every((group) => typeof group?.name === "string")) {
          // A user's groups come in no particular order (it depends on their ids)
          return [key, [...field].sort((a, b) => a.name.localeCompare(b.name))];
        }
        return [key, stabilize(field)];
      })
    );
  }
  return value;
}

interface ApiActivity {
  pending: Set<Request>;
  lastChange: number;
}

const apiActivity = new WeakMap<Page, ApiActivity>();

/**
 * Makes a Redash page render the same on every run and instance: fixes the browser's clock, rewrites timestamps,
 * run times and API keys in API responses, limits the data source types and replaces profile pictures.
 */
export async function stabilizePage(page: Page) {
  const activity: ApiActivity = { pending: new Set(), lastChange: Date.now() };
  apiActivity.set(page, activity);

  await page.clock.install({ time: NOW });
  await page.route(/\/api\//, async (route) => {
    const request = route.request();
    activity.pending.add(request);
    try {
      const response = await route.fetch();
      if (!response.headers()["content-type"]?.includes("application/json")) {
        await route.fulfill({ response });
        return;
      }
      let json = await response.json();
      if (new URL(request.url()).pathname.endsWith("/api/data_sources/types")) {
        json = json.filter(({ type }: { type: string }) => DATA_SOURCE_TYPES.includes(type));
      }
      await route.fulfill({ response, json: stabilize(json) });
    } finally {
      activity.pending.delete(request);
      activity.lastChange = Date.now();
    }
  });
  await page.route(/gravatar\.com\//, (route) => route.fulfill({ body: AVATAR, contentType: "image/png" }));
}

/** Waits until no API request was pending for a while (requests go through the route set up by `stabilizePage`). */
async function waitForApiIdle(page: Page) {
  const activity = apiActivity.get(page);
  if (!activity) {
    throw new Error("Call stabilizePage() first");
  }
  const deadline = Date.now() + READY_TIMEOUT;
  while (activity.pending.size > 0 || Date.now() - activity.lastChange < API_IDLE_TIME) {
    if (Date.now() > deadline) {
      throw new Error(
        `API requests still pending: ${Array.from(activity.pending, (request) => request.url()).join(", ")}`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * Waits until the page finished loading: the app rendered (the splash screen is gone), no API request is pending,
 * images loaded, no spinner is shown and nothing is animating. Screenshot comparisons alone would accept a loading state that stays the
 * same for a while.
 */
export async function waitForPageReady(page: Page) {
  await page.waitForFunction(
    () => {
      const root = document.getElementById("application-root");
      return !root || root.childElementCount > 0; // pages rendered by the server have no root
    },
    undefined,
    { timeout: READY_TIMEOUT }
  );
  await waitForApiIdle(page);
  await page.waitForFunction(
    ({ loading, motion }) =>
      Array.from(document.images).every((image) => image.complete) &&
      // Unlike Playwright's visibility check, `checkVisibility` also skips elements hidden with `opacity: 0`
      // (e.g. the parameters' Apply Changes button)
      Array.from(document.querySelectorAll(loading)).every(
        (element) => !element.checkVisibility({ opacityProperty: true, visibilityProperty: true })
      ) &&
      // Menus and dialogs finished opening (disabling animations for the screenshot can leave them hidden)
      !document.querySelector(motion) &&
      // eslint-disable-next-line compat/compat -- runs in Playwright's Chromium, not the app's supported browsers
      document
        .getAnimations()
        .every(
          (animation) => animation.playState !== "running" || animation.effect?.getTiming().iterations === Infinity
        ),
    { loading: LOADING, motion: MOTION },
    { timeout: READY_TIMEOUT }
  );
  await waitForApiIdle(page); // in case the page loaded more data in the meantime
}
