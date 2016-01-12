from redash.models import db
import peewee
from playhouse.migrate import PostgresqlMigrator, migrate

if __name__ == '__main__':
    migrator = PostgresqlMigrator(db.database)

    with db.database.transaction():
        # Change the uniqueness constraint on data source name to be (org, name):
        success = False
        for index_name in ['unique_name', 'data_sources_name']:
            try:
                print "Trying to remove data source name uniqueness index with the name: {}".format(index_name)
                migrate(migrator.drop_index("data_sources", index_name))
                print "Success!"
                success = True
                break
            except peewee.ProgrammingError:
                db.close_db(None)

        if not success:
            print "Failed removing uniqueness constraint on data source name."
            print "Please verify its name in the schema, update the migration and run again."
            exit(1)

        migrate(
            migrator.add_index('data_sources', ('org_id', 'name'), unique=True)
        )

    db.close_db(None)


