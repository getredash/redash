import click
import simplejson
from flask import current_app
from flask.cli import FlaskGroup, run_command

from redash import __version__, create_app, settings
from redash.cli import data_sources, database, groups, organization, queries, users, rq
from redash.monitor import get_status


def create(group):
    app = current_app or create_app()
    group.app = app

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
    print(simplejson.dumps(get_status(), indent=2))


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
    from redash import mail
    from flask_mail import Message

    if email is None:
        email = settings.MAIL_DEFAULT_SENDER

    mail.send(
        Message(
            subject="Test Message from Redash", recipients=[email], body="Test message."
        )
    )


@manager.command()
def ipython():
    """Starts IPython shell instead of the default Python shell."""
    import sys
    import IPython
    from flask.globals import _app_ctx_stack

    app = _app_ctx_stack.top.app

    banner = "Python %s on %s\nIPython: %s\nRedash version: %s\n" % (
        sys.version,
        sys.platform,
        IPython.__version__,
        __version__,
    )

    ctx = {}
    ctx.update(app.make_shell_context())

    IPython.embed(banner1=banner, user_ns=ctx)
