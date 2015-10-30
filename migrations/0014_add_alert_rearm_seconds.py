from playhouse.migrate import PostgresqlMigrator, migrate

from redash.models import db
from redash import models

if __name__ == '__main__':
    db.connect_db()
    migrator = PostgresqlMigrator(db.database)

    with db.database.transaction():
        column = models.Alert.rearm
        column.null = True
        migrate(
            migrator.add_column('alerts', 'rearm', models.User.rearm),
        )
    db.close_db(None)
