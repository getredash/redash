import os

from alembic.config import Config
from alembic.script import ScriptDirectory


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
