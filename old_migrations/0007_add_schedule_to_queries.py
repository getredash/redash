from playhouse.migrate import PostgresqlMigrator, migrate

from redash.models import db
from redash import models

if __name__ == '__main__':
    db.connect_db()
    migrator = PostgresqlMigrator(db.database)

    with db.database.transaction():
        migrate(
            migrator.add_column('queries', 'schedule', models.Query.schedule),
        )

        db.database.execute_sql("UPDATE queries SET schedule = ttl WHERE ttl > 0;")

        migrate(
            migrator.drop_column('queries', 'ttl')
        )

    db.close_db(None)
