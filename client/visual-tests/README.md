# Visualization visual tests

Screenshot tests for every visualization type, with different setting variants. Each visualization is
rendered on a (public) dashboard of a running Redash instance, and its screenshot is compared to the
baseline in [`__screenshots__/`](__screenshots__).

- [`examples.ts`](examples.ts) - the example queries and visualizations. To cover a new setting, add a
  visualization (or a query) here and update the baselines.
- [`seed.setup.ts`](seed.setup.ts) - loads the examples through the Redash API: a SQLite data source,
  the queries (executed), their visualizations, and one shared dashboard per visualization type named
  "Visualization Examples: &lt;type&gt;". Examples from a previous run are archived first.
- [`visualizations.spec.ts`](visualizations.spec.ts) - takes a screenshot of every widget.
- [`fixtures/chinook.db`](fixtures/chinook.db) - the [Chinook sample database](https://github.com/lerocha/chinook-database)
  (a digital music store), MIT license.

## Running

You need a running Redash with a worker (queries are executed when seeding), e.g. `docker compose up -d`,
started with `REDASH_FEATURE_ALLOW_CUSTOM_JS_VISUALIZATIONS=true` (add it to `.env`): custom JavaScript charts
are disabled by default, and the examples include one. The seed fails if the setting is off.
The SQLite file has to be readable by the worker; by default the data source points at
`/app/client/visual-tests/fixtures/chinook.db`, which is where the repository is in the Redash containers
(override with `VISUAL_TESTS_DB_PATH`).

Screenshots depend on the OS, fonts and browser build, so run the tests inside the Playwright Docker image:

```bash
export VISUAL_TESTS_API_KEY=...          # your user's API key (profile page), or:
# export VISUAL_TESTS_EMAIL=... VISUAL_TESTS_PASSWORD=...
pnpm visual-tests:docker                 # compare with the baselines
pnpm visual-tests:docker --update-snapshots   # accept changes: rewrites the baselines (commit them)
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
fresh instance (this is what CI does).

After a failure, open the report with the expected, actual and diff images:
`pnpm exec playwright show-report client/visual-tests/.results/report`.

`pnpm visual-tests` runs the same tests with the locally installed browsers - handy for seeding the examples
and browsing them, but screenshots won't match the baselines outside Docker.

## Stable screenshots

Rendering in the Docker image is deterministic, so the comparison has no pixel tolerance. To keep it that way:

- `Math.random` is seeded (word cloud layout).
- Map tiles are replaced with a plain gray tile.
- "Updated x minutes ago" timestamps are hidden ([`screenshot.css`](screenshot.css)).
