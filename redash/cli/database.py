from flask_script import Manager

manager = Manager(help="Manage the database (create/drop tables).")

@manager.command
def create_tables():
    """Create the database tables."""
    from redash.models import create_db, init_db

    create_db(True, False)
    init_db()

@manager.command
def drop_tables():
    """Drop the database tables."""
    from redash.models import create_db

    create_db(False, True)
