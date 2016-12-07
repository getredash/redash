from flask.cli import AppGroup

manager = AppGroup(help="Manage the database (create/drop tables).")


@manager.command()
def create_tables():
    """Create the database tables."""
    from redash.models import db, create_db, init_db
    create_db(True, True)
    init_db()
    db.session.commit()


@manager.command()
def drop_tables():
    """Drop the database tables."""
    from redash.models import create_db

    create_db(False, True)
