from playhouse.migrate import Migrator
from redash import db
from redash import models


if __name__ == '__main__':
    db.connect_db()
    migrator = Migrator(db.database)
    with db.database.transaction():
        migrator.add_column(models.DataSource, models.DataSource.queue_name, 'queue_name')
        migrator.add_column(models.DataSource, models.DataSource.scheduled_queue_name, 'scheduled_queue_name')

    db.close_db(None)