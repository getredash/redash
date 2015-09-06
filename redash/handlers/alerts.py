import time

from flask import request
from funcy import project

from redash import models
from redash.wsgi import api
from redash.tasks import record_event
from redash.handlers.base import BaseResource, require_fields


class AlertAPI(BaseResource):
    def get(self, alert_id):
        alert = models.Alert.get_by_id(alert_id)
        return alert.to_dict()

    def post(self, alert_id):
        req = request.get_json(True)
        params = project(req, ('options', 'name', 'query_id'))
        alert = models.Alert.get_by_id(alert_id)
        if 'query_id' in params:
            params['query'] = params.pop('query_id')

        alert.update_instance(**params)

        record_event.delay({
            'user_id': self.current_user.id,
            'action': 'edit',
            'timestamp': int(time.time()),
            'object_id': alert.id,
            'object_type': 'alert'
        })

        return alert.to_dict()


class AlertListAPI(BaseResource):
    def post(self):
        req = request.get_json(True)
        require_fields(req, ('options', 'name', 'query_id'))

        alert = models.Alert.create(
            name=req['name'],
            query=req['query_id'],
            user=self.current_user,
            options=req['options']
        )

        record_event.delay({
            'user_id': self.current_user.id,
            'action': 'create',
            'timestamp': int(time.time()),
            'object_id': alert.id,
            'object_type': 'alert'
        })

        # TODO: should be in model?
        models.AlertSubscription.create(alert=alert, user=self.current_user)

        record_event.delay({
            'user_id': self.current_user.id,
            'action': 'subscribe',
            'timestamp': int(time.time()),
            'object_id': alert.id,
            'object_type': 'alert'
        })

        return alert.to_dict()

    def get(self):
        return [alert.to_dict() for alert in models.Alert.all()]


class AlertSubscriptionListResource(BaseResource):
    def post(self, alert_id):
        subscription = models.AlertSubscription.create(alert=alert_id, user=self.current_user)
        record_event.delay({
            'user_id': self.current_user.id,
            'action': 'subscribe',
            'timestamp': int(time.time()),
            'object_id': alert_id,
            'object_type': 'alert'
        })
        return subscription.to_dict()

    def get(self, alert_id):
        subscriptions = models.AlertSubscription.all(alert_id)
        return [s.to_dict() for s in subscriptions]


class AlertSubscriptionResource(BaseResource):
    def delete(self, alert_id, subscriber_id):
        models.AlertSubscription.unsubscribe(alert_id, subscriber_id)
        record_event.delay({
            'user_id': self.current_user.id,
            'action': 'unsubscribe',
            'timestamp': int(time.time()),
            'object_id': alert_id,
            'object_type': 'alert'
        })

api.add_resource(AlertAPI, '/api/alerts/<alert_id>', endpoint='alert')
api.add_resource(AlertSubscriptionListResource, '/api/alerts/<alert_id>/subscriptions', endpoint='alert_subscriptions')
api.add_resource(AlertSubscriptionResource, '/api/alerts/<alert_id>/subscriptions/<subscriber_id>', endpoint='alert_subscription')
api.add_resource(AlertListAPI, '/api/alerts', endpoint='alerts')
