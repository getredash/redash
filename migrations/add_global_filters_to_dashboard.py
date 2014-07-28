from playhouse.migrate import Migrator
from redash import models
from redash.models import db


if __name__ == '__main__':
    db.connect_db()
    migrator = Migrator(db.database)
    with db.database.transaction():
        migrator.add_column(models.Dashboard, models.Dashboard.dashboard_filters_enabled, 'dashboard_filters_enabled')

    db.close_db(None)
