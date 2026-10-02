# Visual tests

Screenshot tests compared to the baselines in [`__screenshots__/`](__screenshots__):

- **Visualizations**: every visualization type with different setting variants, rendered on (public) dashboards.
- **Pages**: full pages and dialogs of the app (queries, dashboards, alerts, users, settings, ...), logged in
  as the admin.

Files:

- [`examples.ts`](examples.ts) - the example queries and visualizations. To cover a new setting, add a
  visualization (or a query) here and update the baselines.
- [`seed.setup.ts`](seed.setup.ts) - loads the examples through the Redash API: a SQLite data source,
  the queries (executed), their visualizations, and one shared dashboard per visualization type named
  "Visualization Examples: &lt;type&gt;". Examples from a previous run are archived first.
- [`visualizations.spec.ts`](visualizations.spec.ts) - takes a screenshot of every widget.
- [`pages.setup.ts`](pages.setup.ts) - loads the objects shown on the pages (users, a group, data sources,
  alert destinations, queries with parameters, an alert, a dashboard...), all named "Page Examples: ...", and
  saves the admin's session for the browser.
- [`pages.spec.ts`](pages.spec.ts) - the pages and dialogs to take a screenshot of. To cover another page, add it
  to `PAGES` (and the objects it needs to `pages.setup.ts`).
- [`stability.spec.ts`](stability.spec.ts) - browser regression tests for date handling and embed URL normalization;
  these run without a Redash server (`--project stability`).
- [`fixtures/chinook.db`](fixtures/chinook.db) - the [Chinook sample database](https://github.com/lerocha/chinook-database)
  (a digital music store), MIT license.

## Running

You need a running Redash with a worker (queries are executed when seeding), e.g. `docker compose up -d`,
started with `REDASH_FEATURE_ALLOW_CUSTOM_JS_VISUALIZATIONS=true` (add it to `.env`): custom JavaScript charts
are disabled by default, and the examples include one. The seed fails if the setting is off.
The SQLite file has to be readable by the worker; by default the data source points at
`/app/client/visual-tests/fixtures/chinook.db`, which is where the repository is in the Redash containers
(override with `VISUAL_TESTS_DB_PATH`).

Page screenshots show everything on the instance (all users, data sources, groups...), so **the page tests need a
fresh instance**, like in CI. They also log in with an email and password rather than an API key. For example,
with the CI stack on port 5000:

```bash
export COMPOSE_FILE=.ci/compose.cypress.yaml COMPOSE_PROJECT_NAME=visual-tests
export REDASH_FEATURE_ALLOW_CUSTOM_JS_VISUALIZATIONS=true VISUAL_TESTS_BASE_URL=http://localhost:5000
docker compose build server worker scheduler
docker compose run --rm server create_db
docker compose up -d server worker scheduler
pnpm visual-tests:docker                             # all visual tests
docker compose down -v                               # start from scratch next time
```

Screenshots depend on the OS, fonts and browser build, so run the tests inside the Playwright Docker image:

```bash
export VISUAL_TESTS_API_KEY=...          # your user's API key (profile page), or:
# export VISUAL_TESTS_EMAIL=... VISUAL_TESTS_PASSWORD=...
pnpm visual-tests:docker                 # compare with the baselines
pnpm visual-tests:docker --update-snapshots   # accept changes: rewrites the baselines (commit them)
pnpm visual-tests:docker --project visualizations   # only the visualizations (works on any instance)
pnpm visual-tests:docker --project pages # only the pages
pnpm visual-tests:docker -g Chart        # only the Chart dashboard
pnpm visual-tests:docker --no-deps       # skip seeding, reuse the examples from the previous run
```

| Variable                                       | Default                                        |
| ---------------------------------------------- | ---------------------------------------------- |
| `VISUAL_TESTS_BASE_URL`                        | `http://localhost:5001`                        |
| `VISUAL_TESTS_API_KEY`                         | -                                              |
| `VISUAL_TESTS_EMAIL` / `VISUAL_TESTS_PASSWORD` | `admin@redash.io` / `password`                 |
| `VISUAL_TESTS_DB_PATH`                         | `/app/client/visual-tests/fixtures/chinook.db` |

Without an API key the seed logs in with the email and password, running the initial setup first on a
fresh instance (this is what CI does). The page tests always log in with the email and password.

After a failure, open the report with the expected, actual and diff images:
`pnpm exec playwright show-report client/visual-tests/.results/report`.

`pnpm visual-tests` runs the same tests with locally installed browsers (`pnpm exec playwright install chromium`) - handy for seeding the examples
and browsing them, but screenshots won't match the baselines outside Docker.

## Stable screenshots

Rendering in the Docker image is deterministic, so the comparison has no pixel tolerance. To keep it that way:

- `Math.random` is seeded (word cloud layout).
- Map tiles are replaced with a plain gray tile.
- Visualizations: "Updated x minutes ago" timestamps are hidden ([`screenshot.css`](screenshot.css)).
- Pages ([`stable-page.ts`](stable-page.ts)): the browser's date starts at a known time and keeps advancing,
  while timers and animation frames remain native. API responses are rewritten so
  timestamps, query run times and API keys are the same on every run. Profile pictures (Gravatar) are replaced,
  and the data source type lists only show types available on every server. Screenshots are taken once the page
  stopped loading (no spinners), and [`pages.css`](pages.css) makes the whole page scroll (so full-page
  screenshots capture everything) and hides tooltips and the editor's cursor. URLs that include the server's
  address are masked. Embed URLs also have their origin and object IDs normalized before the screenshot so
  different URL lengths cannot change line wrapping and the dialog's height.
