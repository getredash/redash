from playhouse.migrate import PostgresqlMigrator, migrate

from redash.models import db
from redash import models

if __name__ == '__main__':
    db.connect_db()
    migrator = PostgresqlMigrator(db.database)

    with db.database.transaction():
        migrate(
            migrator.add_column('queries', 'updated_at', models.Query.updated_at),
            migrator.add_column('dashboards', 'updated_at', models.Dashboard.updated_at),
            migrator.add_column('widgets', 'updated_at', models.Widget.updated_at),
            migrator.add_column('users', 'created_at', models.User.created_at),
            migrator.add_column('users', 'updated_at', models.User.updated_at),
            migrator.add_column('visualizations', 'created_at', models.Visualization.created_at),
            migrator.add_column('visualizations', 'updated_at', models.Visualization.updated_at)
        )

        db.database.execute_sql("UPDATE queries SET updated_at = created_at;")
        db.database.execute_sql("UPDATE dashboards SET updated_at = created_at;")
        db.database.execute_sql("UPDATE widgets SET updated_at = created_at;")

    db.close_db(None)
