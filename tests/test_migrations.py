import glob
import importlib.util
import os

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
