from redash.models import db, Change, AccessPermission, Query, Dashboard
from playhouse.migrate import PostgresqlMigrator, migrate

if __name__ == '__main__':

    if not Change.table_exists():
        Change.create_table()

    if not AccessPermission.table_exists():
        AccessPermission.create_table()

    migrator = PostgresqlMigrator(db.database)

    try:
        migrate(
            migrator.add_column('queries', 'version', Query.version),
            migrator.add_column('dashboards', 'version', Dashboard.version)
        )
    except Exception as ex:
        print "Error while adding version column to queries/dashboards. Maybe it already exists?"
        print ex

