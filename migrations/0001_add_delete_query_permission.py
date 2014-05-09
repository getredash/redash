from playhouse.migrate import Migrator
from redash import db
from redash import models


if __name__ == '__main__':
    db.connect_db()
    
    with db.database.transaction():
        models.Group.update(permissions=models.Group.DEFAULT_PERMISSIONS).where(models.Group.name == 'default').execute()

    db.close_db(None)
