from playhouse.migrate import PostgresqlMigrator, migrate

from redash.models import db
from redash import models

if __name__ == '__main__':
    db.connect_db()
    migrator = PostgresqlMigrator(db.database)

    with db.database.transaction():
        column = models.User.api_key
        column.null = True
        migrate(
            migrator.add_column('users', 'api_key', models.User.api_key),
        )

        for user in models.User.select(models.User.id, models.User.api_key):
            user.save(only=user.dirty_fields)

        migrate(
            migrator.add_not_null('users', 'api_key')
        )

    db.close_db(None)
