from playhouse.migrate import Migrator
from redash.models import db
from redash import models


if __name__ == '__main__':
    db.connect_db()
    migrator = Migrator(db.database)
    with db.database.transaction():
        migrator.add_column(models.Widget, models.Widget.text, 'text')
        migrator.set_nullable(models.Widget, models.Widget.visualization, True)

    db.close_db(None)
