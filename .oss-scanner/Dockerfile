# Build Redash (backend) for Anthropic's OSS Scanner.
# The scanner uses the repository root as the build context and audits /src offline, so everything the
# tests need is installed here. This mirrors the project's own Dockerfile (python:3.13-slim-bookworm, uv,
# the main + all_ds + dev dependency groups) and adds a local PostgreSQL and Redis, which the test suite
# needs. The frontend (client/) is not built; its source is still in /src for review.
FROM python:3.13-slim-bookworm

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

ENV DEBIAN_FRONTEND=noninteractive

# System packages from the project's Dockerfile (needed to build the data source drivers), plus
# PostgreSQL and Redis servers for the tests.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        pkg-config curl gnupg build-essential pwgen libffi-dev git libkrb5-dev libpq-dev g++ unixodbc-dev \
        xmlsec1 libssl-dev default-libmysqlclient-dev freetds-dev libsasl2-dev unzip \
        libsasl2-modules-gssapi-mit \
        postgresql postgresql-contrib redis-server sudo \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.11.6 /uv /usr/local/bin/uv

ENV UV_PROJECT_ENVIRONMENT=/usr/local \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

# Scanner contract: the checkout lives inside the image, at /src.
COPY . /src
WORKDIR /src

# Same dependency set the project's CI uses for the backend tests.
RUN uv sync --frozen --no-install-project --no-default-groups --group all_ds --group dev

# The frontend is not built; the server templates only need the HTML shells to exist (as in the
# project's own Dockerfile with skip_frontend_build).
RUN mkdir -p client/dist && touch client/dist/index.html client/dist/multi_org.html

# The network is gone after this point: never try to re-resolve or re-sync.
ENV UV_FROZEN=1 \
    UV_NO_SYNC=1 \
    UV_OFFLINE=1 \
    REDASH_DATABASE_URL=postgresql://postgres@localhost/tests \
    REDASH_REDIS_URL=redis://localhost:6379/0 \
    REDASH_COOKIE_SECRET=oss-scanner-not-a-secret \
    REDASH_SECRET_KEY=oss-scanner-not-a-secret

# `redash-test-services` starts PostgreSQL (trust auth on localhost, `tests` database) and Redis.
# Run it once in a fresh shell before `pytest tests/...`.
RUN PGVER="$(ls /usr/lib/postgresql)" \
    && sed -i 's/^\(local\|host\)\(.*\)\(peer\|scram-sha-256\|md5\)$/\1\2trust/' /etc/postgresql/$PGVER/main/pg_hba.conf \
    && printf '%s\n' '#!/bin/bash' 'set -e' \
        'service postgresql start >/dev/null' \
        'redis-server --daemonize yes >/dev/null' \
        'for i in $(seq 30); do pg_isready -q -h localhost && break; sleep 1; done' \
        'psql -h localhost -U postgres -tc "select 1 from pg_database where datname='"'"'tests'"'"'" | grep -q 1 || psql -h localhost -U postgres -c "create database tests" >/dev/null' \
        'echo "PostgreSQL and Redis are running; run: pytest tests/<path>"' \
        > /usr/local/bin/redash-test-services \
    && chmod +x /usr/local/bin/redash-test-services

# Run a fast slice of the test suite so the image is known to work; a failing test must not abort the build.
RUN redash-test-services \
    && (pytest -q -p no:cacheprovider tests/test_authentication.py tests/handlers/test_users.py \
        || echo "WARNING: pytest reported failures")
