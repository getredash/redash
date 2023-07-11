import logging
import time

import sqlalchemy
from click import argument, option
from cryptography.fernet import InvalidToken
from flask.cli import AppGroup
from flask_migrate import stamp
from sqlalchemy.exc import DatabaseError
from sqlalchemy.sql import select
from sqlalchemy_utils.types.encrypted.encrypted_type import FernetEngine

from redash import settings
from redash.models.base import Column, key_type
from redash.models.types import EncryptedConfiguration
from redash.utils.configuration import ConfigurationContainer

manager = AppGroup(help="Manage the database (create/drop tables. reencrypt data.).")


def _wait_for_db_connection(db):
    retried = False
    while not retried:
        try:
            db.engine.execute("SELECT 1;")
            return
        except DatabaseError:
            time.sleep(30)

        retried = True


def is_db_empty():
    from redash.models import db

    table_names = sqlalchemy.inspect(db.get_engine()).get_table_names()
    return len(table_names) == 0


def load_extensions(db):
    with db.engine.connect() as connection:
        for extension in settings.dynamic_settings.database_extensions:
            connection.execute(f'CREATE EXTENSION IF NOT EXISTS "{extension}";')


@manager.command(name="create_tables")
def create_tables():
    """Create the database tables."""
    from redash.models import db

    _wait_for_db_connection(db)

    # We need to make sure we run this only if the DB is empty, because otherwise calling
    # stamp() will stamp it with the latest migration value and migrations won't run.
    if is_db_empty():
        load_extensions(db)

        # To create triggers for searchable models, we need to call configure_mappers().
        sqlalchemy.orm.configure_mappers()
        db.create_all()

        # Need to mark current DB as up to date
        stamp()


@manager.command(name="drop_tables")
def drop_tables():
    """Drop the database tables."""
    from redash.models import db

    _wait_for_db_connection(db)
    db.drop_all()


@manager.command()
@argument("old_secret")
@argument("new_secret")
@option("--show-sql/--no-show-sql", default=False, help="show sql for debug")
def reencrypt(old_secret, new_secret, show_sql):
    """Reencrypt data encrypted by OLD_SECRET with NEW_SECRET."""
    from redash.models import db

    _wait_for_db_connection(db)

    if show_sql:
        logging.basicConfig()
        logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)

    def _reencrypt_for_table(table_name, orm_name):
        table_for_select = sqlalchemy.Table(
            table_name,
            sqlalchemy.MetaData(),
            Column("id", key_type(orm_name), primary_key=True),
            Column(
                "encrypted_options",
                ConfigurationContainer.as_mutable(EncryptedConfiguration(db.Text, old_secret, FernetEngine)),
            ),
        )
        table_for_update = sqlalchemy.Table(
            table_name,
            sqlalchemy.MetaData(),
            Column("id", key_type(orm_name), primary_key=True),
            Column(
                "encrypted_options",
                ConfigurationContainer.as_mutable(EncryptedConfiguration(db.Text, new_secret, FernetEngine)),
            ),
        )

        update = table_for_update.update()
        selected_items = db.session.execute(select([table_for_select]))
        for item in selected_items:
            try:
                stmt = update.where(table_for_update.c.id == item["id"]).values(
                    encrypted_options=item["encrypted_options"]
                )
            except InvalidToken:
                logging.error(f'Invalid Decryption Key for id {item["id"]} in table {table_for_select}')
            else:
                db.session.execute(stmt)

        selected_items.close()
        db.session.commit()

    _reencrypt_for_table("data_sources", "DataSource")
    _reencrypt_for_table("notification_destinations", "NotificationDestination")
