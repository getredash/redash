from redash.models import db, NotificationDestination, AlertSubscription
from playhouse.migrate import PostgresqlMigrator, migrate

if __name__ == '__main__':
    migrator = PostgresqlMigrator(db.database)
    with db.database.transaction():

        if not NotificationDestination.table_exists():
            NotificationDestination.create_table()

        # Update alert subscription fields
        migrate(
            migrator.add_column('alert_subscriptions', 'destination_id', AlertSubscription.destination)
        )

    db.close_db(None)
