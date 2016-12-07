from playhouse.migrate import PostgresqlMigrator, migrate

from redash.models import db
from redash import models

if __name__ == '__main__':
    db.connect_db()
    migrator = PostgresqlMigrator(db.database)

    with db.database.transaction():
        migrate(
            migrator.add_column('queries', 'last_modified_by_id', models.Query.last_modified_by)
        )

        db.database.execute_sql("UPDATE queries SET last_modified_by_id = user_id;")

    db.close_db(None)
