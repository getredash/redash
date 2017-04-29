from flask.cli import AppGroup
from flask_migrate import stamp
manager = AppGroup(help="Manage the database (create/drop tables).")


@manager.command()
def create_tables():
    """Create the database tables."""
    from redash.models import db
    db.create_all()

    # Need to mark current DB as up to date
    stamp()


@manager.command()
def drop_tables():
    """Drop the database tables."""
    from redash.models import db

    db.drop_all()
