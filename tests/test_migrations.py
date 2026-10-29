import glob
import importlib.util
import json
import os

import sqlalchemy_searchable as ss
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.operations import Operations
from alembic.script import ScriptDirectory
from sqlalchemy import text

from redash.models import Query, db
from tests import BaseTestCase


def test_only_single_head_revision_in_migrations():
    """
    If multiple developers are working on migrations and one of them is merged before the
    other you might end up with multiple heads (multiple revisions with the same down_revision).

    This makes sure that there is only a single head revision in the migrations directory.

    Adopted from https://blog.jerrycodes.com/multiple-heads-in-alembic-migrations/.
    """
    config = Config(os.path.join("migrations", "alembic.ini"))
    config.set_main_option("script_location", "migrations")
    script = ScriptDirectory.from_config(config)

    # This will raise if there are multiple heads
    script.get_current_head()


def run_migration(revision, direction="upgrade"):
    (path,) = glob.glob(os.path.join("migrations", "versions", f"{revision}_*.py"))
    spec = importlib.util.spec_from_file_location(f"migration_{revision}", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    with db.engine.begin() as connection:
        with Operations.context(MigrationContext.configure(connection)):
            getattr(module, direction)()


class TestUpdateSearchExpressions(BaseTestCase):
    def test_installs_search_functions_on_existing_database(self):
        query = self.factory.create_query(name="Weekly revenue")
        db.session.commit()

        with db.engine.begin() as connection:
            # The trigger that maintains search_vector is installed by migrations, which the
            # test database doesn't run.
            connection.execute(text("UPDATE queries SET search_vector = to_tsvector('pg_catalog.simple', name)"))
            # Databases created before sqlalchemy-searchable 1.3 don't have these functions.
            connection.execute(text("DROP FUNCTION parse_websearch(regconfig, text)"))
            connection.execute(text("DROP FUNCTION parse_websearch(text)"))

        run_migration("2f2a8a6f9c21")

        self.assertEqual([query.id], [q.id for q in Query.query.search("rev")])


class TestDataMigrations(BaseTestCase):
    """Old data migrations still run when upgrading older installs."""

    def run_migration(self, revision, prepare=()):
        # Release the test session's locks before altering tables.
        db.session.commit()
        db.session.close()
        with db.engine.begin() as connection:
            for statement in prepare:
                connection.execute(text(statement))
        run_migration(revision)

    def scalar(self, statement):
        with db.engine.connect() as connection:
            return connection.execute(text(statement)).scalar()

    def test_inline_tags(self):
        dashboard = self.factory.create_dashboard(name="Sales: weekly #kpi")

        self.run_migration("0f740a081d20")

        self.assertEqual(["Sales", "kpi"], self.scalar(f"SELECT tags FROM dashboards WHERE id = {dashboard.id}"))

    def test_fix_hash(self):
        query = self.factory.create_query(query_text="SELECT 1")
        expected_hash = query.query_hash

        self.run_migration("9e8c841d1a30", prepare=[f"UPDATE queries SET query_hash = 'stale' WHERE id = {query.id}"])

        self.assertEqual(expected_hash, self.scalar(f"SELECT query_hash FROM queries WHERE id = {query.id}"))

    def test_search_vector_trigger(self):
        # The migration clears sqlalchemy-searchable's global vectorizers, which the rest
        # of the test run relies on.
        vectorizers = dict(vars(ss.vectorizer))
        self.addCleanup(lambda: vars(ss.vectorizer).update(vectorizers))
        query = self.factory.create_query(name="Weekly revenue")

        self.run_migration("6b5be7e0a0ef")
        with db.engine.begin() as connection:
            # The trigger fills search_vector on update.
            connection.execute(text(f"UPDATE queries SET name = name WHERE id = {query.id}"))

        self.assertEqual([query.id], [q.id for q in Query.query.search("rev")])

    def test_profile_image_url_moves_into_details(self):
        user = self.factory.create_user()

        self.run_migration(
            "fd4fc850d7ea",
            prepare=[
                "ALTER TABLE users ADD COLUMN profile_image_url varchar(320)",
                f"UPDATE users SET profile_image_url = 'https://example.com/me.png' WHERE id = {user.id}",
            ],
        )

        details = self.scalar(f"SELECT details FROM users WHERE id = {user.id}")
        self.assertEqual("https://example.com/me.png", details["profile_image_url"])

    def test_widget_positions(self):
        dashboard = self.factory.create_dashboard()
        widget = self.factory.create_widget(dashboard=dashboard, width=1, options={})

        self.run_migration(
            "969126bd800f",
            prepare=[
                # The columns and types this migration saw when it was written.
                "ALTER TABLE widgets ADD COLUMN type varchar(100)",
                "ALTER TABLE widgets ADD COLUMN query_id integer",
                "ALTER TABLE dashboards ALTER COLUMN layout TYPE text USING layout::text",
                "ALTER TABLE widgets ALTER COLUMN options TYPE text USING options::text",
                f"UPDATE dashboards SET layout = '[[{widget.id}]]' WHERE id = {dashboard.id}",
            ],
        )

        options = self.scalar(f"SELECT options FROM widgets WHERE id = {widget.id}")
        self.assertEqual({"row": 0, "col": 0, "sizeX": 3}, json.loads(options)["position"])
