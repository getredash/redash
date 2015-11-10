import peewee
from playhouse.migrate import PostgresqlMigrator, migrate
from redash import models
from redash.models import db


if __name__ == '__main__':
    db.connect_db()
    migrator = PostgresqlMigrator(db.database)

    with db.database.transaction():
        migrate(
            migrator.add_column('data_sources', 'access_groups', models.DataSource.access_groups),
        )
        models.DataSource.update(access_groups=['default']).execute()

    db.close_db(None)
