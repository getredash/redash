from playhouse.migrate import Migrator
from redash import db
from redash import models


if __name__ == '__main__':
    db.connect_db()
    migrator = Migrator(db.database)
    with db.database.transaction():
        migrator.add_column(models.User, models.User.permissions, 'permissions')
        models.User.update(permissions=['admin'] + models.User.DEFAULT_PERMISSIONS).where(models.User.is_admin == True).execute()

    db.close_db(None)
