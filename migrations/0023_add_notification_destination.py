from redash import settings
from redash.models import db, NotificationDestination, AlertSubscription, Alert
from redash.destinations import get_configuration_schema_for_destination_type
from redash.utils.configuration import ConfigurationContainer
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

            if settings.WEBHOOK_ENDPOINT:
                # Have all existing alerts send to webhook if already configured
                schema = get_configuration_schema_for_destination_type('webhook')
                conf = {'url': settings.WEBHOOK_ENDPOINT}
                if settings.WEBHOOK_USERNAME:
                    conf['username'] = settings.WEBHOOK_USERNAME
                    conf['password'] = settings.WEBHOOK_PASSWORD
                options = ConfigurationContainer(conf, schema)

                webhook = NotificationDestination.create(
                    org=1,
                    user=1,
                    name="Webhook",
                    type="webhook",
                    options=options
                )

                for alert in Alert.select():
                    AlertSubscription.create(
                        user=1,
                        destination=webhook,
                        alert=alert
                    )

            if settings.HIPCHAT_API_TOKEN:
                # Have all existing alerts send to HipChat if already configured
                schema = get_configuration_schema_for_destination_type('hipchat')
                conf = {'token': settings.HIPCHAT_API_TOKEN,
                        'room_id': settings.HIPCHAT_ROOM_ID}
                if settings.HIPCHAT_API_URL:
                    conf['url'] = settings.HIPCHAT_API_URL
                options = ConfigurationContainer(conf, schema)

                hipchat = NotificationDestination.create(
                    org=1,
                    user=1,
                    name="HipChat",
                    type="hipchat",
                    options=options
                )

                for alert in Alert.select():
                    AlertSubscription.create(
                        user=1,
                        destination=hipchat,
                        alert=alert
                    )

    db.close_db(None)
