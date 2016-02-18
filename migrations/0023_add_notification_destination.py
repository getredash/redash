from redash.models import db, NotificationDestination, NotificationDestinationGroup

if __name__ == '__main__':
    with db.database.transaction():

        if not NotificationDestination.table_exists():
            NotificationDestination.create_table()

        if not NotificationDestinationGroup.table_exists():
            NotificationDestinationGroup.create_table()

    db.close_db(None)

