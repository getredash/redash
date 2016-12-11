from redash.models import db
import peewee
from playhouse.migrate import PostgresqlMigrator, migrate

if __name__ == '__main__':
    migrator = PostgresqlMigrator(db.database)

    with db.database.transaction():
        # Change the uniqueness constraint on data source name to be (org, name):
        # In some cases it's a constraint:
        db.database.execute_sql('ALTER TABLE data_sources DROP CONSTRAINT IF EXISTS unique_name')
        # In others only an index:
        db.database.execute_sql('DROP INDEX IF EXISTS data_sources_name')

        migrate(
            migrator.add_index('data_sources', ('org_id', 'name'), unique=True)
        )

    db.close_db(None)
