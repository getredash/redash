#!/usr/bin/env python
"""
CLI to manage redash.
"""
import datetime
from flask.ext.script import Manager, prompt_pass

from redash import settings, models, __version__
from redash.wsgi import app
from redash.import_export import import_manager

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
    """Prints deprecation warning."""
    print "** This command is deprecated. Please use Celery's CLI to control the workers. **"


@manager.shell
def make_shell_context():
    from redash.models import db
    return dict(app=app, db=db, models=models)

@manager.command
def check_settings():
    from types import ModuleType

    for name in dir(settings):
        item = getattr(settings, name)
        if not callable(item) and not name.startswith("__") and not isinstance(item, ModuleType):
            print "{} = {}".format(name, item)

@manager.command
def import_events(events_file):
    import json

    count = 0
    with open(events_file) as f:
        for line in f:
            try:
                event = json.loads(line)

                user = event.pop('user_id')
                action = event.pop('action')
                object_type = event.pop('object_type')
                object_id = event.pop('object_id')
                created_at = datetime.datetime.utcfromtimestamp(event.pop('timestamp'))
                additional_properties = json.dumps(event)

                models.Event.create(user=user, action=action, object_type=object_type, object_id=object_id,
                                    additional_properties=additional_properties, created_at=created_at)

                count += 1

            except Exception as ex:
                print "Failed importing line:"
                print line
                print ex.message

    print "Importe %d rows" % count


@database_manager.command
def create_tables():
    """Creates the database tables."""
    from redash.models import create_db, init_db

    create_db(True, False)
    init_db()

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
@users_manager.option('--groups', dest='groups', default=models.User.DEFAULT_GROUPS, help="Comma seperated list of groups (leave blank for default).")
def create(email, name, groups, is_admin=False, google_auth=False, password=None):
    print "Creating user (%s, %s)..." % (email, name)
    print "Admin: %r" % is_admin
    print "Login with Google Auth: %r\n" % google_auth
    if isinstance(groups, basestring):
        groups= groups.split(',')
        groups.remove('') # in case it was empty string

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