import json

import click
from flask import current_app
from flask.cli import FlaskGroup, run_command, with_appcontext
from rq import Connection

from redash import __version__, create_app, rq_redis_connection, settings
from redash.cli import (
    data_sources,
    database,
    groups,
    organization,
    queries,
    rq,
    users,
)
from redash.monitor import get_status


def create():
    app = current_app or create_app()

    @app.shell_context_processor
    def shell_context():
        from redash import models, settings

        return {"models": models, "settings": settings}

    return app


@click.group(cls=FlaskGroup, create_app=create)
def manager():
    """Management script for Redash"""


manager.add_command(database.manager, "database")
manager.add_command(users.manager, "users")
manager.add_command(groups.manager, "groups")
manager.add_command(data_sources.manager, "ds")
manager.add_command(organization.manager, "org")
manager.add_command(queries.manager, "queries")
manager.add_command(rq.manager, "rq")
manager.add_command(run_command, "runserver")


@manager.command()
def version():
    """Displays Redash version."""
    print(__version__)


@manager.command()
def status():
    with Connection(rq_redis_connection):
        print(json.dumps(get_status(), indent=2))


@manager.command()
def check_settings():
    """Show the settings as Redash sees them (useful for debugging)."""
    for name, item in current_app.config.items():
        print("{} = {}".format(name, item))


@manager.command()
@click.argument("email", default=settings.MAIL_DEFAULT_SENDER, required=False)
def send_test_mail(email=None):
    """
    Send test message to EMAIL (default: the address you defined in MAIL_DEFAULT_SENDER)
    """
    from flask_mail import Message

    from redash import mail

    if email is None:
        email = settings.MAIL_DEFAULT_SENDER

    mail.send(Message(subject="Test Message from Redash", recipients=[email], body="Test message."))


@manager.command("shell")
@with_appcontext
def shell():
    import sys

    from flask.globals import _app_ctx_stack
    from ptpython import repl

    app = _app_ctx_stack.top.app

    repl.embed(globals=app.make_shell_context())
