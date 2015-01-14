#!/usr/bin/env python
"""
CLI to manage redash.
"""
from flask.ext.script import Manager

from redash import settings, models, __version__
from redash.wsgi import app
from redash.import_export import import_manager
from redash.cli import users, database, data_sources

manager = Manager(app)

@manager.command
def version():
    """Displays re:dash version."""
    print __version__


@manager.command
def runworkers():
    """Start workers (deprecated)."""
    print "** This command is deprecated. Please use Celery's CLI to control the workers. **"


@manager.shell
def make_shell_context():
    from redash.models import db
    return dict(app=app, db=db, models=models)


@manager.command
def check_settings():
    """Show the settings as re:dash sees them (useful for debugging)."""
    from types import ModuleType

    for name in dir(settings):
        item = getattr(settings, name)
        if not callable(item) and not name.startswith("__") and not isinstance(item, ModuleType):
            print "{} = {}".format(name, item)


manager.add_command("database", database.manager)
manager.add_command("users", users.manager)
manager.add_command("import", import_manager)
manager.add_command("ds", data_sources.manager)

if __name__ == '__main__':
    manager.run()