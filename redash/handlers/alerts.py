import time

from flask import request
from funcy import project

from redash import models
from redash.permissions import require_access, require_admin_or_owner, view_only, require_permission
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

        self.update_model(alert, params)
        models.db.session.commit()

        self.record_event({
            'action': 'edit',
            'timestamp': int(time.time()),
            'object_id': alert.id,
            'object_type': 'alert'
        })

        return alert.to_dict()

    def delete(self, alert_id):
        alert = get_object_or_404(models.Alert.get_by_id_and_org, alert_id, self.current_org)
        require_admin_or_owner(alert.user_id)
        models.db.session.delete(alert)
        models.db.session.commit()


class AlertListResource(BaseResource):
    def post(self):
        req = request.get_json(True)
        require_fields(req, ('options', 'name', 'query_id'))

        query = models.Query.get_by_id_and_org(req['query_id'],
                                               self.current_org)
        require_access(query.groups, self.current_user, view_only)

        alert = models.Alert(
            name=req['name'],
            query_rel=query,
            user=self.current_user,
            options=req['options']
        )

        models.db.session.add(alert)
        models.db.session.flush()
        models.db.session.commit()

        self.record_event({
            'action': 'create',
            'timestamp': int(time.time()),
            'object_id': alert.id,
            'object_type': 'alert'
        })

        return alert.to_dict()

    @require_permission('list_alerts')
    def get(self):
        return [alert.to_dict() for alert in models.Alert.all(group_ids=self.current_user.group_ids)]


class AlertSubscriptionListResource(BaseResource):
    def post(self, alert_id):
        req = request.get_json(True)

        alert = models.Alert.get_by_id_and_org(alert_id, self.current_org)
        require_access(alert.groups, self.current_user, view_only)
        kwargs = {'alert': alert, 'user': self.current_user}

        if 'destination_id' in req:
            destination = models.NotificationDestination.get_by_id_and_org(req['destination_id'], self.current_org)
            kwargs['destination'] = destination

        subscription = models.AlertSubscription(**kwargs)
        models.db.session.add(subscription)
        models.db.session.commit()

        self.record_event({
            'action': 'subscribe',
            'timestamp': int(time.time()),
            'object_id': alert_id,
            'object_type': 'alert',
            'destination': req.get('destination_id')
        })

        d = subscription.to_dict()
        return d

    def get(self, alert_id):
        alert_id = int(alert_id)
        alert = models.Alert.get_by_id_and_org(alert_id, self.current_org)
        require_access(alert.groups, self.current_user, view_only)

        subscriptions = models.AlertSubscription.all(alert_id)
        return [s.to_dict() for s in subscriptions]


class AlertSubscriptionResource(BaseResource):
    def delete(self, alert_id, subscriber_id):
        subscription = models.AlertSubscription.query.get_or_404(subscriber_id)
        require_admin_or_owner(subscription.user.id)
        models.db.session.delete(subscription)
        models.db.session.commit()

        self.record_event({
            'action': 'unsubscribe',
            'timestamp': int(time.time()),
            'object_id': alert_id,
            'object_type': 'alert'
        })
