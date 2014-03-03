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
from flask.ext.script import Manager, prompt_pass

manager = Manager(app)
database_manager = Manager(help="Manages the database (create/drop tables).")
users_manager = Manager(help="Users management commands.")

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
                data_manager.report_status()
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


@users_manager.option('email', help="User's email")
@users_manager.option('name', help="User's full name")
@users_manager.option('--admin', dest='is_admin', default=False, help="set user as admin")
@users_manager.option('--google', dest='google_auth', default=False, help="user uses Google Auth to login")
def create(email, name, is_admin=False, google_auth=False):
    print "Creating user (%s, %s)..." % (email, name)
    print "Admin: %r" % is_admin
    print "Login with Google Auth: %r\n" % google_auth

    user = models.User(email=email, name=name, is_admin=is_admin)
    if not google_auth:
        password = prompt_pass("Password")
        user.hash_password(password)

    try:
        user.save()
    except Exception, e:
        print "Failed creating user: %s" % e.message


@users_manager.option('email', help="email address of user to delete")
def delete(email):
    deleted_count = models.User.delete().where(models.User.email == email).execute()
    print "Deleted %d users." % deleted_count

manager.add_command("database", database_manager)
manager.add_command("users", users_manager)

if __name__ == '__main__':
    channel = logging.StreamHandler()
    logging.getLogger().addHandler(channel)
    logging.getLogger().setLevel(settings.LOG_LEVEL)

    manager.run()