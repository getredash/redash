import logging
import time

import sqlalchemy
from click import argument, option
from cryptography.fernet import InvalidToken
from flask.cli import AppGroup
from flask_migrate import stamp, upgrade
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
    from redash.stacklet.auth import get_env_db

    engine = get_env_db()
    db._engine = engine

    schema = db.metadata.schema
    extant_tables = set(sqlalchemy.inspect(engine).get_table_names())
    redash_tables = set(table.lstrip(f"{schema}.") for table in db.metadata.tables)
    num_missing = len(redash_tables - redash_tables.intersection(extant_tables))
    print(f"Checking schema {schema} for tables {redash_tables}: found {extant_tables} (missing {num_missing})")
    return num_missing == len(redash_tables)


def load_extensions(db):
    with db.engine.connect() as connection:
        for extension in settings.dynamic_settings.database_extensions:
            connection.execute(f'CREATE EXTENSION IF NOT EXISTS "{extension}";')


@manager.command(name="create_tables")
def create_tables():
    """Create the database tables."""
    from redash.models import db

    if is_db_empty():
        if settings.SQLALCHEMY_DATABASE_SCHEMA:
            from sqlalchemy import DDL
            from sqlalchemy import event

            event.listen(
                db.metadata,
                "before_create",
                DDL(
                    f"CREATE SCHEMA IF NOT EXISTS {settings.SQLALCHEMY_DATABASE_SCHEMA}"
                ),
            )

        _wait_for_db_connection(db)

        # We need to make sure we run this only if the DB is empty, because otherwise calling
        # stamp() will stamp it with the latest migration value and migrations won't run.
        load_extensions(db)

        # To create triggers for searchable models, we need to call configure_mappers().
        sqlalchemy.orm.configure_mappers()
        db.create_all()

        db.session.execute("ALTER TABLE query_results ENABLE ROW LEVEL SECURITY")
        db.session.execute(
            """
            CREATE POLICY all_visible ON query_results
            USING (true);
            """
        )
        db.session.execute(
            """
            CREATE POLICY limited_visibility ON query_results
            AS RESTRICTIVE
            FOR SELECT
            TO limited_visibility
            USING (current_user = db_role);
            """
        )

        # Need to mark current DB as up to date
        stamp()
    else:
        print("existing redash tables detected, upgrading instead")
        upgrade()


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
