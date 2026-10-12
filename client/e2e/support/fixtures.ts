import fs from "fs";
import { test as base, type BrowserContext, expect, type Page } from "@playwright/test";
import { RedashApi } from "../../visual-tests/api";
import { ADMIN, HTTP_FIXTURE_URL, MAIL_URL, MANIFEST_PATH, VIEWER_STATE } from "./env";

export { expect } from "@playwright/test";
export { RedashApi };

/** Written by the setup project: ids of the objects every test may rely on. */
export interface Manifest {
  adminId: number;
  viewerId: number;
  viewerGroupId: number;
  dataSources: { postgres: number; mysql: number | null; queryResults: number; json: number; csv: number };
}

/**
 * Watches every page of the test. Uncaught exceptions in the page and HTTP 5xx responses from Redash fail the
 * test unless it allowed them; console errors are attached to the report.
 */
export interface Guard {
  /** Uncaught page exceptions matching one of these are expected in this test. */
  allowPageErrors(...patterns: RegExp[]): void;
  /** HTTP 5xx responses ("500 GET /api/...") matching one of these are expected in this test. */
  allowServerErrors(...patterns: RegExp[]): void;
  /** Also watch the pages of another browser context (the ones made by `viewerPage`/`anonPage` already are). */
  watch(context: BrowserContext): void;
  readonly pageErrors: string[];
  readonly serverErrors: string[];
  readonly consoleErrors: string[];
}

export interface Mail {
  to: { address: string }[];
  subject: string;
  html: string;
  text: string;
}

export interface ReceivedRequest {
  time: string;
  path: string;
  body: string;
}

interface TestFixtures {
  guard: Guard;
  /** A page of the limited user (view-only access to the PostgreSQL data source, not an admin). */
  viewerPage: Page;
  /** A page of a browser that is not logged in. */
  anonPage: Page;
}

interface WorkerFixtures {
  /** API client logged in as the admin, for preparing data and for checking what the UI saved. */
  api: RedashApi;
  seed: Manifest;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  api: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright requires the fixtures argument to be destructured
    async ({}, use, workerInfo) => {
      const api = await RedashApi.login(workerInfo.project.use.baseURL, ADMIN);
      await use(api);
      await api.dispose();
    },
    { scope: "worker" },
  ],

  seed: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright requires the fixtures argument to be destructured
    async ({}, use) => {
      await use(JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")));
    },
    { scope: "worker" },
  ],

  guard: [
    async ({ context, baseURL }, use, testInfo) => {
      const pageErrors: string[] = [];
      const serverErrors: string[] = [];
      const consoleErrors: string[] = [];
      const allowedPageErrors: RegExp[] = [];
      const allowedServerErrors: RegExp[] = [];

      const watchPage = (page: Page) => {
        page.on("pageerror", (error) => pageErrors.push(String(error)));
        page.on("console", (message) => {
          if (message.type() === "error") {
            consoleErrors.push(message.text());
          }
        });
        page.on("response", (response) => {
          if (response.status() >= 500 && baseURL && response.url().startsWith(baseURL)) {
            const { pathname } = new URL(response.url());
            serverErrors.push(`${response.status()} ${response.request().method()} ${pathname}`);
          }
        });
      };
      const watch = (watched: BrowserContext) => {
        watched.pages().forEach(watchPage);
        watched.on("page", watchPage);
      };
      watch(context);

      await use({
        allowPageErrors: (...patterns) => void allowedPageErrors.push(...patterns),
        allowServerErrors: (...patterns) => void allowedServerErrors.push(...patterns),
        watch,
        pageErrors,
        serverErrors,
        consoleErrors,
      });

      if (consoleErrors.length > 0) {
        await testInfo.attach("console errors", { body: consoleErrors.join("\n"), contentType: "text/plain" });
      }
      const unexpected = [
        ...pageErrors.filter((error) => !allowedPageErrors.some((pattern) => pattern.test(error))),
        ...serverErrors.filter((error) => !allowedServerErrors.some((pattern) => pattern.test(error))),
      ];
      expect(unexpected, "uncaught page errors and HTTP 5xx responses during the test").toEqual([]);
    },
    { auto: true },
  ],

  viewerPage: async ({ browser, guard, baseURL }, use) => {
    const context = await browser.newContext({ storageState: VIEWER_STATE, baseURL });
    guard.watch(context);
    await use(await context.newPage());
    await context.close();
  },

  anonPage: async ({ browser, guard, baseURL }, use) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] }, baseURL });
    guard.watch(context);
    await use(await context.newPage());
    await context.close();
  },
});

/** A name that is unique across runs and workers, so tests can run on an instance that already has data. */
export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

/** The mail catcher (maildev). The mailbox is shared by all tests: look for your own recipient or subject. */
export const mailbox = {
  async all(): Promise<Mail[]> {
    return (await fetch(`${MAIL_URL}/email`)).json();
  },
  async waitFor(matches: (mail: Mail) => boolean, timeout = 60_000): Promise<Mail> {
    let found: Mail | undefined;
    await expect(async () => {
      found = (await mailbox.all()).reverse().find(matches);
      expect(found, "an email matching the condition is in the mail catcher").toBeDefined();
    }).toPass({ timeout });
    return found as unknown as Mail;
  },
  sentTo(address: string) {
    return (mail: Mail) => mail.to.some((recipient) => recipient.address === address);
  },
};

/** POST requests received by the HTTP fixture (`http://e2e-http:8000/<path>` from inside Redash). */
export const webhooks = {
  async all(): Promise<ReceivedRequest[]> {
    return (await fetch(`${HTTP_FIXTURE_URL}/requests`)).json();
  },
  async waitFor(path: string, count = 1, timeout = 60_000): Promise<ReceivedRequest[]> {
    let found: ReceivedRequest[] = [];
    await expect(async () => {
      found = (await webhooks.all()).filter((request) => request.path === path);
      expect(found.length, `POST requests to ${path} received by the HTTP fixture`).toBeGreaterThanOrEqual(count);
    }).toPass({ timeout });
    return found;
  },
};
