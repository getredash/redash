from redash.models import db
import peewee
from playhouse.migrate import PostgresqlMigrator, migrate

if __name__ == '__main__':
    migrator = PostgresqlMigrator(db.database)
    with db.database.transaction():
        db.database.execute_sql('ALTER TABLE queries ALTER COLUMN schedule TYPE text;')
    db.close_db(None)