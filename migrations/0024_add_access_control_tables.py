from redash import settings
from redash.models import db, Change, AccessPermission
from playhouse.migrate import PostgresqlMigrator, migrate

if __name__ == '__main__':
    if not Change.table_exists():
        Change.create_table()
    if not AccessPermission.table_exists():
        AccessPermission.create_table()
