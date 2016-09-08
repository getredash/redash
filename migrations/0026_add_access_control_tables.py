from redash import settings
from redash.models import db, Change, AccessPermission, Query, Dashboard
from playhouse.migrate import PostgresqlMigrator, migrate

if __name__ == '__main__':

    if not Change.table_exists():
        Change.create_table()

    if not AccessPermission.table_exists():
        AccessPermission.create_table()

    migrator = PostgresqlMigrator(db.database)
    for tbl, field in (('queries', Query.version), ('dashboards', Dashboard.version)):
        try:
            with db.database.transaction():
                migrate(
                    migrator.add_column(tbl, 'version', field)
                )
        except Exception, e:
            print('WARNING: Unable to add column "version" to table "%s" - maybe it already exists?' % tbl)
