import peewee
from playhouse.migrate import PostgresqlMigrator, migrate

from redash.models import db
from redash import models

if __name__ == '__main__':
    db.connect_db()
    migrator = PostgresqlMigrator(db.database)

    cursor = db.database.execute_sql("SELECT column_name FROM information_schema.columns WHERE table_name='alerts' and column_name='rearm';")
    if cursor.rowcount > 0:
        print "Column exists. Skipping."
        exit()

    with db.database.transaction():
        migrate(
            migrator.add_column('alerts', 'rearm', models.Alert.rearm),
        )

    db.close_db(None)
