from playhouse.migrate import Migrator
from redash import db
from redash import models


if __name__ == '__main__':
    db.connect_db()
    migrator = Migrator(db.database)
    with db.database.transaction():
        migrator.add_column(models.Dashboard, models.Dashboard.created_at, 'created_at')
        migrator.add_column(models.Widget, models.Widget.created_at, 'created_at')

    db.close_db(None)