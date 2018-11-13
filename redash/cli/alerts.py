from __future__ import print_function
from click import argument
from flask.cli import AppGroup

from redash import models

manager = AppGroup(help="Organization management commands.")


@manager.command()
def list():
    """List all Alerts"""
    alerts = models.Alert.query
    for i, alert in enumerate(alerts.order_by(models.Alert.name)):
        if i > 0:
            print("-" * 20)

	print("id: {}".format(alert.id))
	print("name: {}".format(alert.name))
	print("user_id: {}".format(alert.user_id))
	print("query_id: {}".format(alert.query_id))
	print("query_rel: {}".format(alert.query_rel))
	print("user: {}".format(alert.user))
	print("state: {}".format(alert.state))
	print("options: {}".format(alert.options))
	print("query_rel: {}".format(alert.query_rel))
	print("subscriptions: {}".format(alert.subscriptions))

        #subscription_name = [subscription.name for subscription in alert.subscriptions]
	#print("subscription: {}".format(subscription_name))

	print("last_triggered_at: {}".format(alert.last_triggered_at))
	print("rearm: {}".format(alert.rearm))
