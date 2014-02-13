#!/usr/bin/env python
"""
CLI to manage redash.
"""
import atfork
atfork.monkeypatch_os_fork_functions()
import atfork.stdlib_fixer
atfork.stdlib_fixer.fix_logging_module()

import logging
import time
from redash import settings, app, db, models, data_manager, __version__
from flask.ext.script import Manager

manager = Manager(app)
database_manager = Manager(help="Manages the database (create/drop tables).")

@manager.command
def version():
    """Displays re:dash version."""
    print __version__


@manager.command
def runworkers():
    """Starts the re:dash query executors/workers."""

    try:
        old_workers = data_manager.redis_connection.smembers('workers')
        data_manager.redis_connection.delete('workers')

        logging.info("Cleaning old workers: %s", old_workers)

        data_manager.start_workers(settings.WORKERS_COUNT, settings.CONNECTION_ADAPTER, settings.CONNECTION_STRING)
        logging.info("Workers started.")

        while True:
            try:
                data_manager.refresh_queries()
            except Exception as e:
                logging.error("Something went wrong with refreshing queries...")
                logging.exception(e)
            time.sleep(60)
    except KeyboardInterrupt:
        logging.warning("Exiting; waiting for threads")
        data_manager.stop_workers()

@manager.shell
def make_shell_context():
    return dict(app=app, db=db, models=models)

@database_manager.command
def create_tables():
    """Creates the database tables."""
    from redash.models import create_db

    create_db(True, False)

@database_manager.command
def drop_tables():
    """Drop the database tables."""
    from redash.models import create_db

    create_db(False, True)

manager.add_command("database", database_manager)

if __name__ == '__main__':
    channel = logging.StreamHandler()
    logging.getLogger().addHandler(channel)
    logging.getLogger().setLevel(settings.LOG_LEVEL)

    manager.run()