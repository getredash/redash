import json
import itertools
import peewee
from playhouse.migrate import Migrator
from redash import db, settings
from redash import models

if __name__ == '__main__':
    db.connect_db()

    if not models.User.table_exists():
        print "Creating user table..."
        models.User.create_table()

    migrator = Migrator(db.database)
    with db.database.transaction():
        print "Creating user field on dashboard and queries..."
        try:
            migrator.rename_column(models.Query, '"user"', "user_email")
            migrator.rename_column(models.Dashboard, '"user"', "user_email")
        except peewee.ProgrammingError:
            print "Failed to rename user column -- assuming it already exists"

    with db.database.transaction():
        models.Query.user.null = True
        models.Dashboard.user.null = True

        try:
            migrator.add_column(models.Query, models.Query.user, "user_id")
            migrator.add_column(models.Dashboard, models.Dashboard.user, "user_id")
        except peewee.ProgrammingError:
            print "Failed to create user_id column -- assuming it already exists"

    print "Creating user for all queries and dashboards..."
    for obj in itertools.chain(models.Query.select(), models.Dashboard.select()):
        # Some old databases might have queries with empty string as user email:
        email = obj.user_email or settings.ADMINS[0]
        email = email.split(',')[0]

        print ".. {} , {}, {}".format(type(obj), obj.id, email)

        try:
            user = models.User.get(models.User.email == email)
        except models.User.DoesNotExist:
            is_admin = email in settings.ADMINS
            user = models.User.create(email=email, name=email, is_admin=is_admin)

        obj.user = user
        obj.save()

    print "Set user_id to non null..."
    with db.database.transaction():
        migrator.set_nullable(models.Query, models.Query.user, False)
        migrator.set_nullable(models.Dashboard, models.Dashboard.user, False)
        migrator.set_nullable(models.Query, models.Query.user_email, True)
        migrator.set_nullable(models.Dashboard, models.Dashboard.user_email, True)
