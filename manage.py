#!/usr/bin/env python
"""
CLI to manage redash.
"""
import signal
import logging
import time
from redash import settings, app, db, models, data_manager, __version__
from redash.import_export import import_manager
from flask.ext.script import Manager, prompt_pass

manager = Manager(app)
database_manager = Manager(help="Manages the database (create/drop tables).")
users_manager = Manager(help="Users management commands.")
data_sources_manager = Manager(help="Data sources management commands.")

@manager.command
def version():
    """Displays re:dash version."""
    print __version__


@manager.command
def runworkers():
    """Starts the re:dash query executors/workers."""

    def stop_handler(signum, frame):
        logging.warning("Exiting; waiting for workers")
        data_manager.stop_workers()
        exit()

    signal.signal(signal.SIGTERM, stop_handler)
    signal.signal(signal.SIGINT, stop_handler)

    old_workers = data_manager.redis_connection.smembers('workers')
    data_manager.redis_connection.delete('workers')

    logging.info("Cleaning old workers: %s", old_workers)

    data_manager.start_workers(settings.WORKERS_COUNT)
    logging.info("Workers started.")

    while True:
        try:
            data_manager.refresh_queries()
            data_manager.report_status()
        except Exception as e:
            logging.error("Something went wrong with refreshing queries...")
            logging.exception(e)
        time.sleep(60)


@manager.shell
def make_shell_context():
    return dict(app=app, db=db, models=models)

@manager.command
def check_settings():
    from types import ModuleType

    for name in dir(settings):
        item = getattr(settings, name)
        if not callable(item) and not name.startswith("__") and not isinstance(item, ModuleType):
            print "{} = {}".format(name, item)

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
@users_manager.option('--admin', dest='is_admin', action="store_true", default=False, help="set user as admin")
@users_manager.option('--google', dest='google_auth', action="store_true", default=False, help="user uses Google Auth to login")
@users_manager.option('--password', dest='password', default=None, help="Password for users who don't use Google Auth (leave blank for prompt).")
@users_manager.option('--groups', dest='groups', default=['default'], help="Comma seperated list of groups (leave blank for default).")
def create(email, name, groups, is_admin=False, google_auth=False, password=None):
    print "Creating user (%s, %s)..." % (email, name)
    print "Admin: %r" % is_admin
    print "Login with Google Auth: %r\n" % google_auth
    if isinstance(groups, basestring) and len(groups) > 0:
        groups = groups.split(',')
    else:
        groups = ['default']

    if is_admin:
        groups += ['admin']

    user = models.User(email=email, name=name, groups=groups)
    if not google_auth:
        password = password or prompt_pass("Password")
        user.hash_password(password)

    try:
        user.save()
    except Exception, e:
        print "Failed creating user: %s" % e.message


@users_manager.option('email', help="email address of user to delete")
def delete(email):
    deleted_count = models.User.delete().where(models.User.email == email).execute()
    print "Deleted %d users." % deleted_count

@data_sources_manager.command
def import_from_settings(name=None):
    """Import data source from settings (env variables)."""
    name = name or "Default"
    data_source = models.DataSource.create(name=name,
                                           type=settings.CONNECTION_ADAPTER,
                                           options=settings.CONNECTION_STRING)

    print "Imported data source from settings (id={}).".format(data_source.id)


@data_sources_manager.command
def list():
    """List currently configured data sources"""
    for ds in models.DataSource.select():
        print "Name: {}\nType: {}\nOptions: {}".format(ds.name, ds.type, ds.options)

@data_sources_manager.command
def new(name, type, options):
    """Create new data source"""
    # TODO: validate it's a valid type and in the future, validate the options.
    print "Creating {} data source ({}) with options:\n{}".format(type, name, options)
    data_source = models.DataSource.create(name=name,
                                           type=type,
                                           options=options)
    print "Id: {}".format(data_source.id)


manager.add_command("database", database_manager)
manager.add_command("users", users_manager)
manager.add_command("import", import_manager)
manager.add_command("ds", data_sources_manager)

if __name__ == '__main__':
    manager.run()