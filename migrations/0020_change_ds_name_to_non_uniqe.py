from redash.models import db
from playhouse.migrate import PostgresqlMigrator, migrate

if __name__ == '__main__':
    migrator = PostgresqlMigrator(db.database)

    with db.database.transaction():
        # Change the uniqueness constraint on data source name to be (org, name):
        db.database.execute_sql("ALTER TABLE data_sources DROP CONSTRAINT unique_name")
        migrate(
            migrator.add_index('data_sources', ('org_id', 'name'), unique=True)
        )

    db.close_db(None)


