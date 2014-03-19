import logging
import peewee
from playhouse.migrate import Migrator
from redash import db
from redash import models
from redash import settings

if __name__ == '__main__':
    db.connect_db()

    if not models.DataSource.table_exists():
        print "Creating data_sources table..."
        models.DataSource.create_table()

        default_data_source = models.DataSource.create(name="Default",
                                                       type=settings.CONNECTION_ADAPTER,
                                                       options=settings.CONNECTION_STRING)
    else:
        default_data_source = models.DataSource.select().first()

    migrator = Migrator(db.database)
    models.Query.data_source.null = True
    models.QueryResult.data_source.null = True
    try:
        with db.database.transaction():
            migrator.add_column(models.Query, models.Query.data_source, "data_source_id")
    except peewee.ProgrammingError:
        print "Failed to create data_source_id column -- assuming it already exists"

    try:
        with db.database.transaction():
            migrator.add_column(models.QueryResult, models.QueryResult.data_source, "data_source_id")
    except peewee.ProgrammingError:
        print "Failed to create data_source_id column -- assuming it already exists"

    print "Updating data source to existing one..."
    models.Query.update(data_source=default_data_source.id).execute()
    models.QueryResult.update(data_source=default_data_source.id).execute()

    with db.database.transaction():
        print "Setting data source to non nullable..."
        migrator.set_nullable(models.Query, models.Query.data_source, False)

    with db.database.transaction():
        print "Setting data source to non nullable..."
        migrator.set_nullable(models.QueryResult, models.QueryResult.data_source, False)

    db.close_db(None)