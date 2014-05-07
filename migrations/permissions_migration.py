from playhouse.migrate import Migrator
from redash import db
from redash import models


if __name__ == '__main__':
    db.connect_db()
    migrator = Migrator(db.database)
    
    if not models.Group.table_exists():
        print "Creating groups table..."
        models.Group.create_table()
    
    with db.database.transaction():
        models.Group.insert(name='admin', permissions=['admin'], tables=['*']).execute()
        models.Group.insert(name='default', permissions=models.Group.DEFAULT_PERMISSIONS, tables=['*']).execute()
        
        migrator.drop_column(models.User, 'permissions')
        migrator.add_column(models.User, models.User.groups, 'groups')
        
        models.User.update(groups=['admin', 'default']).where(models.User.is_admin == True).execute()
        models.User.update(groups=['default']).where(models.User.is_admin == False).execute()

    db.close_db(None)
