import peewee
from playhouse.migrate import Migrator
from redash import models
from redash.models import db


if __name__ == '__main__':
    db.connect_db()
    migrator = Migrator(db.database)
    
    if not models.Group.table_exists():
        print "Creating groups table..."
        models.Group.create_table()
    
    with db.database.transaction():
        models.Group.insert(name='admin', permissions=['admin'], tables=['*']).execute()
        models.Group.insert(name='api', permissions=['view_query'], tables=['*']).execute()
        models.Group.insert(name='default', permissions=models.Group.DEFAULT_PERMISSIONS, tables=['*']).execute()

        migrator.add_column(models.User, models.User.groups, 'groups')
        
        models.User.update(groups=['admin', 'default']).where(peewee.SQL("is_admin = true")).execute()
        models.User.update(groups=['admin', 'default']).where(peewee.SQL("'admin' = any(permissions)")).execute()
        models.User.update(groups=['default']).where(peewee.SQL("is_admin = false")).execute()

        migrator.drop_column(models.User, 'permissions')
        migrator.drop_column(models.User, 'is_admin')

    db.close_db(None)
