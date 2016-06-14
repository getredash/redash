from redash.models import db, Query
from playhouse.migrate import PostgresqlMigrator, migrate

if __name__ == '__main__':
    migrator = PostgresqlMigrator(db.database)

    with db.database.transaction():
        migrate(
            migrator.add_column('queries', 'options', Query.options),
        )
