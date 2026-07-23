# Redash 10.1.0 Upgrade Lab

This folder is an isolated upstream clone created to evaluate upgrading the legacy fork without disturbing the monorepo repository.

The initial lab build is intentionally minimal:

- optional datasource dependencies are skipped
- dev-only Python dependencies are skipped

This keeps the first milestone narrow: prove that Redash 10.1.0 can boot cleanly on newer Redis/PostgreSQL before validating every datasource plugin.

## Why this lab exists

- The legacy fork lives inside a larger monorepo, so checking out upstream tags directly rewrites unrelated workspace files.
- This clone keeps `v10.1.0` isolated and gives a clean baseline for compatibility testing.
- The lab upgrades runtime services alongside Redash:
  - Redis: `3-alpine` -> `7-alpine`
  - PostgreSQL: `9.5-alpine` -> `17-alpine`

## Important migration note

Do not reuse the old Postgres data directory in place.
For the legacy `9.5` database, the safe path into this lab is logical migration:

1. Dump from the old instance with `pg_dump`.
2. Start the lab with fresh PostgreSQL 17.
3. Restore the dump into the new lab database.

Redis does not need a data migration for this lab. Start it fresh.

## Lab files

- `docker-compose.upgrade-lab.yml`: isolated runtime profile for Redash 10.1.0
- `.env.example.upgrade-lab`: required secret and database variables

## Bring up the lab

Use the example env file for first-pass validation, then replace the placeholder secrets before any long-lived environment:

```powershell
docker compose --env-file .env.example.upgrade-lab -f docker-compose.upgrade-lab.yml config --quiet
docker compose --env-file .env.example.upgrade-lab -f docker-compose.upgrade-lab.yml up -d --build
```

## ClickHouse 19.11 lab

Run this separately from Redash so you can compare data source behavior across versions without disturbing the main app lab:

```powershell
docker compose -f docker-compose.clickhouse19.yml up -d
docker compose -f docker-compose.clickhouse19.yml exec clickhouse clickhouse-client --query "SELECT version()"
```

The HTTP endpoint is exposed on `http://localhost:18123` and the native TCP port on `localhost:19000`.
From the Redash container, use `http://host.docker.internal:18123` as the ClickHouse URL when you add a datasource.

## Suggested first validation

1. Bring up the lab stack.
2. Confirm `/login` loads on port `5100`.
3. Restore a copy of legacy data into PostgreSQL 17.
4. Run the DB migrations in this clone.
5. Validate ClickHouse 19.11 connectivity before attempting UI customization merge.

## Compatibility stance

- Redis 7 is a reasonable target for Redash 10.1.0.
- PostgreSQL 17 is viable for a fresh lab, but migration from 9.5 should be treated as a separate DB modernization step and validated carefully.
- If PostgreSQL 17 exposes ORM or migration issues, fall back to PostgreSQL 13 first, then retest before going higher.
