import time

from flask import request
from funcy import project

from redash import models
from redash.wsgi import api
from redash.permissions import require_access, require_admin_or_owner, view_only
from redash.handlers.base import BaseResource, require_fields, get_object_or_404


class AlertResource(BaseResource):
    def get(self, alert_id):
        alert = get_object_or_404(models.Alert.get_by_id_and_org, alert_id, self.current_org)
        require_access(alert.groups, self.current_user, view_only)
        return alert.to_dict()

    def post(self, alert_id):
        req = request.get_json(True)
        params = project(req, ('options', 'name', 'query_id', 'rearm'))
        alert = get_object_or_404(models.Alert.get_by_id_and_org, alert_id, self.current_org)
        require_admin_or_owner(alert.user.id)

        if 'query_id' in params:
            params['query'] = params.pop('query_id')

        alert.update_instance(**params)

        self.record_event({
            'action': 'edit',
            'timestamp': int(time.time()),
            'object_id': alert.id,
            'object_type': 'alert'
        })

        return alert.to_dict()


class AlertListResource(BaseResource):
    def post(self):
        req = request.get_json(True)
        require_fields(req, ('options', 'name', 'query_id'))

        query = models.Query.get_by_id_and_org(req['query_id'], self.current_org)
        require_access(query.groups, self.current_user, view_only)

        alert = models.Alert.create(
            name=req['name'],
            query=query,
            user=self.current_user,
            options=req['options']
        )

        self.record_event({
            'action': 'create',
            'timestamp': int(time.time()),
            'object_id': alert.id,
            'object_type': 'alert'
        })

        # TODO: should be in model?
        models.AlertSubscription.create(alert=alert, user=self.current_user)

        self.record_event({
            'action': 'subscribe',
            'timestamp': int(time.time()),
            'object_id': alert.id,
            'object_type': 'alert'
        })

        return alert.to_dict()

    def get(self):
        return [alert.to_dict() for alert in models.Alert.all(groups=self.current_user.groups)]


class AlertSubscriptionListResource(BaseResource):
    def post(self, alert_id):
        alert = models.Alert.get_by_id_and_org(alert_id, self.current_org)
        require_access(alert.groups, self.current_user, view_only)

        subscription = models.AlertSubscription.create(alert=alert_id, user=self.current_user)
        self.record_event({
            'action': 'subscribe',
            'timestamp': int(time.time()),
            'object_id': alert_id,
            'object_type': 'alert'
        })

        return subscription.to_dict()

    def get(self, alert_id):
        alert = models.Alert.get_by_id_and_org(alert_id, self.current_org)
        require_access(alert.groups, self.current_user, view_only)

        subscriptions = models.AlertSubscription.all(alert_id)
        return [s.to_dict() for s in subscriptions]


class AlertSubscriptionResource(BaseResource):
    def delete(self, alert_id, subscriber_id):
        models.AlertSubscription.unsubscribe(alert_id, subscriber_id)
        require_admin_or_owner(subscriber_id)

        self.record_event({
            'action': 'unsubscribe',
            'timestamp': int(time.time()),
            'object_id': alert_id,
            'object_type': 'alert'
        })

api.add_org_resource(AlertResource, '/api/alerts/<alert_id>', endpoint='alert')
api.add_org_resource(AlertSubscriptionListResource, '/api/alerts/<alert_id>/subscriptions', endpoint='alert_subscriptions')
api.add_org_resource(AlertSubscriptionResource, '/api/alerts/<alert_id>/subscriptions/<subscriber_id>', endpoint='alert_subscription')
api.add_org_resource(AlertListResource, '/api/alerts', endpoint='alerts')
