import logging
import os
import time

from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from flask import render_template, request
from sqlalchemy import text

logger = logging.getLogger(__name__)

# Don't hit the database on every single request while migrations are pending;
# an admin running them will take at least a few seconds anyway.
RECHECK_INTERVAL_SECONDS = 5

# A migration's DDL can briefly hold a lock covering the alembic_version table
# (it's updated as the last step of each migration). Bound how long we'll wait
# for it so a slow migration can't pile up stuck workers -- if we can't get an
# answer quickly, the caller's fail-open handling takes over.
STATEMENT_TIMEOUT_MS = 2000

# Requests that must keep working even while migrations are pending: health
# checks used by orchestrators, and the static assets the error page itself needs.
EXEMPT_PATHS = ("/ping",)
EXEMPT_PATH_PREFIXES = ("/static/",)


def get_head_revision():
    config = Config(os.path.join("migrations", "alembic.ini"))
    config.set_main_option("script_location", "migrations")
    return ScriptDirectory.from_config(config).get_current_head()


def get_current_revision(db):
    with db.engine.connect() as connection:
        # `SET LOCAL` only reverts automatically at the end of a transaction. An
        # explicit `begin()` guarantees that boundary, so the timeout can't leak
        # onto whatever unrelated query reuses this connection once it's back in
        # the pool (a plain `SET`, without a bounded transaction, would).
        with connection.begin():
            connection.execute(text("SET LOCAL statement_timeout = :timeout"), {"timeout": STATEMENT_TIMEOUT_MS})
            return MigrationContext.configure(connection).get_current_revision()


def is_database_up_to_date(db):
    return get_current_revision(db) == get_head_revision()


class PendingMigrationCheck:
    """
    Blocks requests with a clear message while the database is behind the code's
    migrations, instead of letting routes fail with a raw "column/table does not
    exist" error that looks like an unrelated bug.
    """

    def __init__(self):
        self._up_to_date = False
        # Whether the last completed check found pending migrations. Kept separate
        # from `_up_to_date` so a check that errored doesn't count as "pending".
        self._pending = False
        self._last_checked_at = 0.0

    def init_app(self, app, db):
        @app.before_request
        def check_pending_migrations():
            return self._check(app, db)

    def _check(self, app, db):
        if app.testing:
            # Tests build the schema from the current models (db.create_all()) and
            # never stamp an alembic revision, so this check would always fail.
            # `app.testing` is read here (not in init_app) because tests only flip
            # it on after create_app() has already registered this hook.
            return None

        if self._up_to_date or request.path in EXEMPT_PATHS or request.path.startswith(EXEMPT_PATH_PREFIXES):
            return None

        now = time.monotonic()
        if now - self._last_checked_at < RECHECK_INTERVAL_SECONDS:
            return self._pending_response() if self._pending else None
        self._last_checked_at = now

        try:
            self._up_to_date = is_database_up_to_date(db)
        except Exception:
            # If we can't tell, don't take down the whole app over it.
            logger.exception("Unable to check migration status")
            self._pending = False
            return None

        self._pending = not self._up_to_date
        return self._pending_response() if self._pending else None

    @staticmethod
    def _pending_response():
        return (
            render_template(
                "error.html",
                error_message=(
                    "This Redash instance's database schema is out of date. "
                    "An administrator needs to run the pending migrations "
                    "(e.g. `docker-compose run --rm server manage db upgrade`) before it can be used."
                ),
            ),
            503,
        )


pending_migration_check = PendingMigrationCheck()
