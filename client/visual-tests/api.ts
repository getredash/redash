import { APIRequestContext, APIResponse, request } from "@playwright/test";

const QUERY_TIMEOUT = 120_000;

/**
 * Minimal Redash API client used to seed the examples.
 *
 * Authenticates with `VISUAL_TESTS_API_KEY` when set; otherwise logs in with `VISUAL_TESTS_EMAIL` /
 * `VISUAL_TESTS_PASSWORD`, running the initial setup first on a fresh instance (as in CI).
 */
export class RedashApi {
  private constructor(
    private readonly baseURL: string,
    private readonly context: APIRequestContext,
    private readonly usesSession: boolean
  ) {}

  static async connect(baseURL: string | undefined): Promise<RedashApi> {
    if (!baseURL) {
      throw new Error("baseURL is not configured");
    }
    const apiKey = process.env.VISUAL_TESTS_API_KEY;
    if (apiKey) {
      const context = await request.newContext({ baseURL, extraHTTPHeaders: { Authorization: `Key ${apiKey}` } });
      return new RedashApi(baseURL, context, false);
    }
    return RedashApi.login(baseURL);
  }

  /** Always logs in with a session (email and password), e.g. to reuse the session in the browser. */
  static async login(baseURL: string | undefined): Promise<RedashApi> {
    if (!baseURL) {
      throw new Error("baseURL is not configured");
    }
    const email = process.env.VISUAL_TESTS_EMAIL || "admin@redash.io";
    const password = process.env.VISUAL_TESTS_PASSWORD || "password";
    const context = await request.newContext({ baseURL });
    const api = new RedashApi(baseURL, context, true);

    // `/setup` renders the setup form only when there is no organization yet; otherwise it redirects.
    const setupPage = await context.get("/setup", { maxRedirects: 0 });
    if (setupPage.status() === 200) {
      await api.submitForm("/setup", { name: "Admin", email, password, org_name: "Redash" });
    }
    await api.submitForm("/login", { email, password });

    const session = await context.get("/api/session");
    if (!session.ok()) {
      throw new Error(`Failed to log in as ${email}. Set VISUAL_TESTS_EMAIL/PASSWORD or VISUAL_TESTS_API_KEY.`);
    }
    return api;
  }

  /** Accepts an invitation (`invite_link` from `POST /api/users`) by setting the user's password. */
  async acceptInvite(inviteLink: string, password: string) {
    // In a separate session, to stay logged in as the current user
    const context = await request.newContext({ baseURL: this.baseURL });
    const path = new URL(inviteLink, this.baseURL).pathname;
    try {
      await new RedashApi(this.baseURL, context, true).submitForm(path, { password });
    } finally {
      await context.dispose();
    }
  }

  /** Saves the session cookies, to log in the browser as the same user. */
  async saveStorageState(path: string) {
    if (!this.usesSession) {
      throw new Error("Only a logged in session (not an API key) can be saved");
    }
    await this.context.storageState({ path });
  }

  async get<T = any>(path: string, params?: Record<string, string | number>): Promise<T> {
    return this.parse(await this.context.get(path, { params }), "GET", path);
  }

  async post<T = any>(path: string, data: unknown = {}): Promise<T> {
    return this.parse(await this.context.post(path, { data, headers: await this.csrfHeaders() }), "POST", path);
  }

  async delete<T = any>(path: string): Promise<T> {
    return this.parse(await this.context.delete(path, { headers: await this.csrfHeaders() }), "DELETE", path);
  }

  /** Waits for a query execution started with `POST /api/query_results` or `POST /api/queries/<id>/results`. */
  async waitForExecution(response: { job?: { id: string; status: number } }, label: string) {
    let job = response.job;
    const deadline = Date.now() + QUERY_TIMEOUT;
    while (job && job.status < 3) {
      if (Date.now() > deadline) {
        throw new Error(`Query "${label}" did not finish in time - is a Redash worker running?`);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      job = (await this.get(`/api/jobs/${job.id}`)).job;
    }
    if (job && job.status !== 3) {
      throw new Error(`Query "${label}" failed: ${(job as { error?: string }).error}`);
    }
  }

  async dispose() {
    await this.context.dispose();
  }

  private async submitForm(path: string, form: Record<string, string>) {
    await this.context.get(path, { maxRedirects: 0 }); // sets the CSRF cookie
    const csrfToken = await this.csrfToken();
    await this.context.post(path, { form: { ...form, csrf_token: csrfToken }, maxRedirects: 0 });
  }

  private async csrfToken() {
    const { cookies } = await this.context.storageState();
    return cookies.find((cookie) => cookie.name === "csrf_token")?.value || "";
  }

  private async csrfHeaders(): Promise<Record<string, string>> {
    // CSRF is enforced only for session (cookie) authentication
    return this.usesSession ? { "X-CSRFToken": await this.csrfToken() } : {};
  }

  private async parse(response: APIResponse, method: string, path: string) {
    if (!response.ok()) {
      throw new Error(`${method} ${path} failed with ${response.status()}: ${await response.text()}`);
    }
    const body = await response.text();
    return body ? JSON.parse(body) : null; // some DELETE requests respond with an empty body
  }
}
