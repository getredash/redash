# End-to-end tests

Tests that drive Redash through its UI in a real browser (Playwright), against a running server with a worker
and a scheduler. They cover what a user does: logging in, data sources, the query editor and parameters, every
visualization type and its editor, dashboards, sharing and embeds, schedules, alerts and their destinations,
users, groups and permissions, settings, search and the list pages.

They complement the [visual tests](../visual-tests/README.md), which compare screenshots; these tests assert on
behaviour (what is rendered, what was saved, which file was downloaded, which email arrived).

## Layout

- [`playwright.config.ts`](playwright.config.ts) - four projects that run in order: `first-run`, `setup`, `e2e`,
  `exclusive`.
- [`first-run.setup.ts`](first-run.setup.ts) - the first-run setup page. Only does something on an instance
  that has no admin yet (as in CI); skipped otherwise.
- [`global.setup.ts`](global.setup.ts) - prepares, through the API, what every test may rely on: five data
  sources (`E2E PostgreSQL`, `E2E MySQL`, `E2E Query Results`, `E2E JSON`, `E2E CSV`), a limited user in a group
  with view-only access to PostgreSQL, and saved browser sessions for the admin and that user. Safe to rerun.
- [`tests/`](tests) - the tests, one directory per area.
- [`tests-exclusive/`](tests-exclusive) - tests that change a setting of the whole organization which the other
  tests depend on (public URLs, the number format). They run one at a time after everything else has finished.
  Keep them in one file: files of a project run in parallel.
- [`support/fixtures.ts`](support/fixtures.ts) - the `test` object the tests use: an API client (`api`), the
  seeded ids (`seed`), pages for the limited user (`viewerPage`) and for a logged-out browser (`anonPage`), the
  mail catcher (`mailbox`) and the webhook log (`webhooks`).
- [`support/ui.ts`](support/ui.ts) - helpers for the query editor, antd selects, real-mouse drags, and for
  creating queries and visualizations through the API.
- [`support/known-issues.ts`](support/known-issues.ts) - bugs the suite knows about (see below).
- [`fixtures/`](fixtures) - the demo data loaded into the PostgreSQL and MySQL test databases, and a small HTTP
  server that serves sample JSON/CSV and records webhook calls.

## Running

The tests need Redash plus a few services to query and observe: two demo databases, a mail catcher and the HTTP
fixture. [`.ci/compose.e2e.yaml`](../../.ci/compose.e2e.yaml) has all of them:

```bash
export COMPOSE_FILE=.ci/compose.e2e.yaml COMPOSE_PROJECT_NAME=e2e
docker compose build server worker scheduler
docker compose run --rm server create_db
docker compose up -d
pnpm exec playwright install chromium   # once
pnpm e2e                                # everything
docker compose down -v                  # start from scratch next time
```

```bash
pnpm e2e client/e2e/tests/dashboards     # one area
pnpm e2e -g "Cancel stops"               # tests whose title matches
pnpm e2e --grep-invert "@slow|@internet" # skip the slow tests and the ones that need the internet
pnpm e2e --project e2e --no-deps         # skip the setup projects (they already ran on this instance)
pnpm e2e --project exclusive --no-deps   # only the organization-wide settings tests
E2E_VIDEO=on pnpm e2e                    # record a video of every test
pnpm exec playwright show-report client/e2e/.results/report
```

CI (the `frontend-e2e-tests` job in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)) does the same on a
fresh instance with `E2E_INSTALL_GROUPS=main,all_ds`, and keeps the report as an artifact when a test fails.

The tests create everything they need under unique names, so they can run repeatedly on the same instance, and
on one that already has other data. They never edit or delete what they did not create.

| Variable                                      | Default                             | What                                                      |
| --------------------------------------------- | ----------------------------------- | --------------------------------------------------------- |
| `E2E_BASE_URL`                                | `http://localhost:5000`             | Redash, as the browser reaches it                          |
| `E2E_EMAIL` / `E2E_PASSWORD`                  | `admin@redash.io` / `password`      | The admin (created by the first-run test when missing)     |
| `E2E_MAIL_URL`                                | `http://localhost:1080`             | The mail catcher's web API                                 |
| `E2E_HTTP_URL`                                | `http://localhost:8000`             | The HTTP fixture, as the test runner reaches it            |
| `E2E_POSTGRES_HOST` / `E2E_MYSQL_HOST`        | `e2e-postgres` / `e2e-mysql`        | The demo databases, as Redash reaches them                 |
| `E2E_HTTP_INTERNAL_URL`                       | `http://e2e-http:8000`              | The HTTP fixture, as Redash reaches it                     |
| `E2E_PORT` / `E2E_MAIL_PORT` / `E2E_HTTP_PORT`| `5000` / `1080` / `8000`            | Host ports published by the compose file                   |
| `E2E_INSTALL_GROUPS`                          | `main`                              | Python dependency groups of the image (see MySQL below)    |
| `E2E_WORKERS`                                 | `3`                                 | Parallel test files                                        |
| `E2E_BACKEND_UPGRADE`                         | -                                   | Set when the backend has the dependency upgrade of #7830   |

Things to know:

- **MySQL** tests are skipped when the server has no MySQL driver. The driver is in the `all_ds` dependency
  group: build with `E2E_INSTALL_GROUPS=main,all_ds` to run them.
- **`@internet`** tests fetch a public URL through the JSON and CSV data sources, because Redash refuses to query
  private addresses (which another test asserts).
- **`@slow`** tests wait for the scheduler (scheduled refreshes, alert state changes, dashboard auto-refresh) and
  take minutes.
- Rate limiting must be off (`REDASH_RATELIMIT_ENABLED=false`, as in the compose file): the tests log in often.
- Email links use `REDASH_HOST`; the tests open their path on `E2E_BASE_URL`, so the two need not match.

## Console and server errors

Every test fails if the page throws an uncaught exception or Redash answers with an HTTP 5xx, even when its own
assertions pass. A test that expects one says so with `guard.allowPageErrors(...)` or
`guard.allowServerErrors(...)`. Console errors are attached to the report.

## Known issues

A test for a known bug asserts the **correct** behaviour and starts with `knownIssue("<id>")`, which marks it as
expected to fail. The suite stays green while the bug exists; when the bug is fixed the test is reported as
"expected to fail, but passed" - remove the call and the entry in
[`support/known-issues.ts`](support/known-issues.ts) then. That file lists every known issue and where it comes
from.

Bugs that only exist with the backend dependency upgrade (#7830) applied use `backendUpgradeIssue("<id>")`: their
tests pass on a backend without the upgrade and are expected to fail when `E2E_BACKEND_UPGRADE=1` is set.

## Writing tests

- Do the thing under test through the UI with real input (`page.mouse` for drags, hovers and resizes); prepare
  everything else through the API (`createQueryViaApi`, `api.post(...)`), which is faster and more stable.
- Name what you create with `uniqueName("...")` and do not assert on totals that other tests change.
- Assert the outcome: what the page shows and what the API says was saved. No fixed sleeps.
- A test that changes an organization-wide setting restores it in `finally`, and goes in `tests-exclusive/` when
  the setting can make another test fail.
