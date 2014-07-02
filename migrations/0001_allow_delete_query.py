from playhouse.migrate import Migrator
from redash import db
from redash import models

if __name__ == '__main__':
    db.connect_db()
    migrator = Migrator(db.database)
    
    with db.database.transaction():
        migrator.add_column(models.Query, models.Query.is_archived, 'is_archived')

    db.close_db(None)
