from playhouse.migrate import PostgresqlMigrator, migrate

from redash.models import db
from redash import models

if __name__ == '__main__':
    db.connect_db()
    migrator = PostgresqlMigrator(db.database)

    with db.database.transaction():
        migrate(
            migrator.add_column('queries', 'is_draft', models.Query.is_draft)
        )
        migrate(
            migrator.add_column('dashboards', 'is_draft', models.Query.is_draft)
        )
        db.database.execute_sql("UPDATE queries SET is_draft = (name = 'New Query')")
    db.close_db(None)
