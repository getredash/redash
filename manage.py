#!/usr/bin/env python
"""
CLI to manage redash.
"""
import json


import click
from flask.cli import FlaskGroup, run_command

from redash import create_app, settings, __version__
from redash.cli import users, groups, database, data_sources, organization
from redash.monitor import get_status


def create(group):
    app = create_app()
    group.app = app
    return app


@click.group(cls=FlaskGroup, create_app=create)
def manager():
    "Management script for redash"


manager.add_command(database.manager, "database")
manager.add_command(users.manager, "users")
manager.add_command(groups.manager, "groups")
manager.add_command(data_sources.manager, "ds")
manager.add_command(organization.manager, "org")
manager.add_command(run_command, "runserver")


@manager.command()
def version():
    """Displays re:dash version."""
    print __version__


@manager.command()
def status():
    print json.dumps(get_status(), indent=2)


@manager.command()
def runworkers():
    """Start workers (deprecated)."""
    print "** This command is deprecated. Please use Celery's CLI to control the workers. **"


@manager.command()
def check_settings():
    """Show the settings as re:dash sees them (useful for debugging)."""
    for name, item in settings.all_settings().iteritems():
        print "{} = {}".format(name, item)


@manager.command()
@click.argument('email', default=settings.MAIL_DEFAULT_SENDER, required=False)
def send_test_mail(email=None):
    """
    Send test message to EMAIL (default: the address you defined in MAIL_DEFAULT_SENDER)
    """
    from redash import mail
    from flask_mail import Message

    if email is None:
        email = settings.MAIL_DEFAULT_SENDER

    mail.send(Message(subject="Test Message from re:dash", recipients=[email],
                      body="Test message."))


if __name__ == '__main__':
    manager()
