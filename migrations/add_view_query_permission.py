import peewee
from redash import db
from redash import models


if __name__ == '__main__':
    db.connect_db()

    previous_default_permissions = models.User.DEFAULT_PERMISSIONS[:]
    previous_default_permissions.remove('view_query')
    models.User.update(permissions=peewee.fn.array_append(models.User.permissions, 'view_query')).where(peewee.SQL("'view_source' = any(permissions)")).execute()

    db.close_db(None)
