from playhouse.migrate import Migrator
from redash import db
from redash import models


if __name__ == '__main__':
    db.connect_db()
    migrator = Migrator(db.database)
    with db.database.transaction():
        migrator.set_nullable(models.Widget, models.Widget.query_id, True)
        migrator.set_nullable(models.Widget, models.Widget.type, True)

    db.close_db(None)