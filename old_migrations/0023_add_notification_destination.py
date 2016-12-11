import os
import peewee
from redash.models import db, NotificationDestination, AlertSubscription, Alert, Organization, User
from redash.destinations import get_configuration_schema_for_destination_type
from redash.utils.configuration import ConfigurationContainer
from playhouse.migrate import PostgresqlMigrator, migrate

HIPCHAT_API_TOKEN = os.environ.get('REDASH_HIPCHAT_API_TOKEN', None)
HIPCHAT_API_URL = os.environ.get('REDASH_HIPCHAT_API_URL', None)
HIPCHAT_ROOM_ID = os.environ.get('REDASH_HIPCHAT_ROOM_ID', None)

WEBHOOK_ENDPOINT = os.environ.get('REDASH_WEBHOOK_ENDPOINT', None)
WEBHOOK_USERNAME = os.environ.get('REDASH_WEBHOOK_USERNAME', None)
WEBHOOK_PASSWORD = os.environ.get('REDASH_WEBHOOK_PASSWORD', None)

if __name__ == '__main__':
    migrator = PostgresqlMigrator(db.database)
    with db.database.transaction():

        if not NotificationDestination.table_exists():
            NotificationDestination.create_table()
            
            # Update alert subscription fields
            migrate(
                migrator.add_column('alert_subscriptions', 'destination_id', AlertSubscription.destination)
            )

            try:
                org = Organization.get_by_slug('default')
                user = User.select().where(User.org==org, peewee.SQL("%s = ANY(groups)", org.admin_group.id)).get()
            except Exception:
                print "!!! Warning: failed finding default organization or admin user, won't migrate Webhook/HipChat alert subscriptions."
                exit()

            if WEBHOOK_ENDPOINT:
                # Have all existing alerts send to webhook if already configured
                schema = get_configuration_schema_for_destination_type('webhook')
                conf = {'url': WEBHOOK_ENDPOINT}
                if WEBHOOK_USERNAME:
                    conf['username'] = WEBHOOK_USERNAME
                    conf['password'] = WEBHOOK_PASSWORD
                options = ConfigurationContainer(conf, schema)

                webhook = NotificationDestination.create(
                    org=org,
                    user=user,
                    name="Webhook",
                    type="webhook",
                    options=options
                )

                for alert in Alert.select():
                    AlertSubscription.create(
                        user=user,
                        destination=webhook,
                        alert=alert
                    )

            if HIPCHAT_API_TOKEN:
                # Have all existing alerts send to HipChat if already configured
                schema = get_configuration_schema_for_destination_type('hipchat')

                conf = {}

                if HIPCHAT_API_URL:
                    conf['url'] = '{url}/room/{room_id}/notification?auth_token={token}'.format(
                        url=HIPCHAT_API_URL, room_id=HIPCHAT_ROOM_ID, token=HIPCHAT_API_TOKEN)
                else:
                    conf['url'] = 'https://hipchat.com/v2/room/{room_id}/notification?auth_token={token}'.format(
                        room_id=HIPCHAT_ROOM_ID, token=HIPCHAT_API_TOKEN)

                options = ConfigurationContainer(conf, schema)

                hipchat = NotificationDestination.create(
                    org=org,
                    user=user,
                    name="HipChat",
                    type="hipchat",
                    options=options
                )

                for alert in Alert.select():
                    AlertSubscription.create(
                        user=user,
                        destination=hipchat,
                        alert=alert
                    )

    db.close_db(None)
