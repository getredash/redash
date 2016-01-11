from redash.models import db
import peewee
from playhouse.migrate import PostgresqlMigrator, migrate

if __name__ == '__main__':
    migrator = PostgresqlMigrator(db.database)

    with db.database.transaction():
        # Change the uniqueness constraint on data source name to be (org, name):
        success = False
        for constraint in ['unique_name', 'data_sources_name']:
            try:
                db.database.execute_sql("ALTER TABLE data_sources DROP CONSTRAINT {}".format(constraint))
                success = True
                break
            except peewee.ProgrammingError:
                db.close_db(None)

        if not success:
            print "Failed removing uniqueness constraint on data source name."
            print "Please verify its name in the schema, update the migration and run again."
            exit()

        migrate(
            migrator.add_index('data_sources', ('org_id', 'name'), unique=True)
        )

    db.close_db(None)


