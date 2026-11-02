# Threat model

## What this project does and where untrusted input enters
Redash is a self-hosted web app for querying data sources (SQL databases, APIs and others), visualizing the results and sharing them as dashboards and alerts. The backend is Python (Flask, SQLAlchemy, RQ workers) and the frontend is React (`client/`, `viz-lib/`).

Untrusted input enters through:
- **The HTTP API and web UI** (`redash/handlers/`), used by authenticated users of varying privilege and by unauthenticated visitors (login, invite and password-reset flows, public dashboard links, embeds).
- **Authentication integrations** (`redash/authentication/`): password login, Google OAuth, OIDC, SAML, LDAP, remote-user headers and JWT.
- **Query text and parameters** that users send to data sources (`redash/query_runner/`), and the **results** those data sources return. Results are untrusted, because a data source may hold attacker-controlled data.
- **Content shown in the browser**: query results, visualization options, dashboard text widgets, markdown, user names and descriptions.

## Trust boundaries and privilege levels
- **Organizations**: one install can host several organizations (multi-org mode). Data from one org must never be readable or writable from another.
- **Admins** (the `admin` group) are trusted within their org: they manage users, groups, data sources, destinations and settings.
- **Regular users** see only the data sources their groups grant them, at either **full** or **view-only** level. A view-only user must not be able to run new or changed query text against that data source, only saved queries.
- **API keys**: each user has a personal key that acts as that user. Each query has a key that gives read-only access to that saved query's metadata and results, including execution of safe parameterized queries. Dashboards shared publicly get a token that gives read access to that dashboard and its contents only.
- **Unauthenticated visitors** reach only login/setup/invite/reset pages, public dashboards and embeds they hold a valid token for.

## Components that matter most / least
- Most important: authentication and session handling, permission checks (`redash/permissions.py`, `require_*` decorators), org isolation, API key and token handling, query parameter handling (parameterized queries are meant to stop users with view-only access from injecting into query text), XSS in the frontend and in rendered results, and secrets stored for data sources and destinations (they must never be returned to non-admins or shown in clear text in the API).
- Important: alert destinations (webhooks, email, Slack and others) and the RQ workers.
- Less important: individual query runners for niche data sources, the migrations, the `bin/` scripts and dev tooling.
- Out of scope: third-party dependencies (report them upstream unless Redash uses them unsafely), `.ci/`, `.github/`, tests.

## How to exercise it
Run `redash-test-services` (starts PostgreSQL and Redis), then `pytest tests/<path>`. `tests/handlers/` covers the HTTP API, `tests/test_authentication.py` and `tests/test_permissions.py` cover auth and access control, and `tests/factories.py` builds orgs, users, groups, data sources and queries. A Flask test client with `authenticated_user(...)` (see `tests/__init__.py`) is the fastest way to reproduce an API-level issue.

## How you rate severity
- **Critical**: unauthenticated remote code execution; unauthenticated access to any org's data or account takeover of an admin; cross-org access with no or minimal privileges.
- **High**: authentication bypass; privilege escalation from a regular user to admin; a view-only user running arbitrary query text; reading data from data sources or queries the user has no access to; leaking data source or destination credentials to non-admins; stored XSS that a regular user can plant and an admin will trigger.
- **Medium**: reflected XSS; CSRF on state-changing actions; stored XSS that only affects users of the same privilege; information leaks of metadata (query names, user emails) across permission boundaries; open redirects that can be chained.
- **Low**: user enumeration, missing hardening headers, rate-limit gaps, DoS that needs an authenticated user.

## Anything to leave alone
These are known design choices (see `SECURITY.md`), so please don't report them:
- **Code execution through the Python query runner.** It is not a sandbox and is disabled by default. Anyone given access to a Python data source is trusted to run code in the worker. Sandbox escapes, including RestrictedPython bypasses, are out of scope.
- **SSRF through a data source an admin configures.** Only admins can create or change data sources, and connecting to arbitrary hosts, internal ones included, is a core function. The same applies to admin-configured alert destinations.
- **Users with full access running arbitrary queries on their data source.** That is the purpose of the product; what the query can do is up to the database account the admin configured.
- **Actions that need admin rights within the admin's own org**, unless they break out of the org or out of Redash itself (for example, an admin reaching code execution on the server).
