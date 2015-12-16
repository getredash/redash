from playhouse.migrate import PostgresqlMigrator, migrate

from redash.models import db
from redash import models

if __name__ == '__main__':
    db.connect_db()
    migrator = PostgresqlMigrator(db.database)

    with db.database.transaction():
        migrate(
            migrator.add_column('alerts', 'rearm', models.Alert.rearm),
        )
    db.close_db(None)
