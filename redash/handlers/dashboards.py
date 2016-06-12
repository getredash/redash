import logging

from flask import request, url_for
from flask_restful import abort

from funcy import distinct, take
from itertools import chain

from redash import models
from redash.permissions import require_permission, require_admin_or_owner
from redash.handlers.base import BaseResource, get_object_or_404


def _save_change(user, dashboard_id, old_dashboard, new_dashboard, change_type):
    change = models.Change()
    change.object_id = dashboard_id
    change.object_type = models.Dashboard.__name__
    change.change_type = change_type
    change.user = user
    change.change = {
        "before": old_dashboard,
        "after": new_dashboard
    }
    change.save()
    return change

class RecentDashboardsResource(BaseResource):
    @require_permission('list_dashboards')
    def get(self):
        recent = [d.to_dict() for d in models.Dashboard.recent(self.current_org, self.current_user.groups, self.current_user.id, for_user=True)]

        global_recent = []
        if len(recent) < 10:
            global_recent = [d.to_dict() for d in models.Dashboard.recent(self.current_org, self.current_user.groups, self.current_user.id)]

        return take(20, distinct(chain(recent, global_recent), key=lambda d: d['id']))


class DashboardListResource(BaseResource):
    @require_permission('list_dashboards')
    def get(self):
        dashboards = [d.to_dict() for d in models.Dashboard.all(self.current_org, self.current_user.groups, self.current_user)]

        for dashboard in dashboards:
            last_change = models.Change.get_latest(object_id=dashboard['id'], object_type=models.Dashboard.__name__)
            if last_change:
                dashboard['latest_version'] = last_change.id

        return dashboards

    @require_permission('create_dashboard')
    def post(self):
        dashboard_properties = request.get_json(force=True)
        dashboard = models.Dashboard(name=dashboard_properties['name'],
                                     org=self.current_org,
                                     user=self.current_user,
                                     layout='[]')
        dashboard.save()

        # create a new Changes record to keep track of the changes
        new_dashboard = {'name': dashboard.name, 'layout': dashboard.layout}
        new_change = _save_change(self.current_user, dashboard.id, None, new_dashboard, change_type=models.Change.TYPE_CREATE)

        result = dashboard.to_dict()
        result['latest_version'] = new_change.id
        return result


class DashboardResource(BaseResource):
    @require_permission('list_dashboards')
    def get(self, dashboard_slug=None):
        dashboard = get_object_or_404(models.Dashboard.get_by_slug_and_org, dashboard_slug, self.current_org)
        response = dashboard.to_dict(with_widgets=True, user=self.current_user)

        api_key = models.ApiKey.get_by_object(dashboard)
        if api_key:
            response['public_url'] = url_for('redash.public_dashboard', token=api_key.api_key, org_slug=self.current_org.slug, _external=True)
            response['api_key'] = api_key.api_key

        last_change = models.Change.get_latest(object_id=dashboard.id, object_type=models.Dashboard.__name__)
        if last_change:
            response['latest_version'] = last_change.id

        return response

    @require_permission('edit_dashboard')
    def post(self, dashboard_slug):
        dashboard_properties = request.get_json(force=True)
        # TODO: either convert all requests to use slugs or ids
        dashboard = models.Dashboard.get_by_id_and_org(dashboard_slug, self.current_org)

        # check access permissions
        if self.current_user.id != dashboard.user.id:
            if not self.current_user.has_access(
                    access_type=models.AccessPermission.ACCESS_TYPE_MODIFY,
                    object_id=dashboard.id,
                    object_type=models.Dashboard.__name__):
                abort(403)

        # Optimistic locking: figure out which user made the last
        # change to this dashboard, and bail out if necessary
        last_change = models.Change.get_latest(object_id=dashboard.id, object_type=models.Dashboard.__name__)
        if last_change and 'latest_version' in dashboard_properties:
            if last_change.id > dashboard_properties['latest_version']:
                abort(409) # HTTP 'Conflict' status code

        old_dashboard = {'name': dashboard.name, 'layout': dashboard.layout}
        dashboard.layout = dashboard_properties['layout']
        dashboard.name = dashboard_properties['name']
        dashboard.save()

        # create a new Changes record to keep track of the changes
        new_dashboard = {'name': dashboard.name, 'layout': dashboard.layout}
        new_change = _save_change(self.current_user, dashboard.id, old_dashboard, new_dashboard, change_type=models.Change.TYPE_MODIFY)

        result = dashboard.to_dict(with_widgets=True, user=self.current_user)
        result['latest_version'] = new_change.id
        return result

    @require_permission('edit_dashboard')
    def delete(self, dashboard_slug):
        dashboard = models.Dashboard.get_by_slug_and_org(dashboard_slug, self.current_org)
        dashboard.is_archived = True
        dashboard.save()

        return dashboard.to_dict(with_widgets=True, user=self.current_user)


class DashboardShareResource(BaseResource):
    def post(self, dashboard_id):
        dashboard = models.Dashboard.get_by_id_and_org(dashboard_id, self.current_org)
        require_admin_or_owner(dashboard.user_id)
        api_key = models.ApiKey.create_for_object(dashboard, self.current_user)
        public_url = url_for('redash.public_dashboard', token=api_key.api_key, org_slug=self.current_org.slug, _external=True)

        return {'public_url': public_url, 'api_key': api_key.api_key}

    def delete(self, dashboard_id):
        dashboard = models.Dashboard.get_by_id_and_org(dashboard_id, self.current_org)
        require_admin_or_owner(dashboard.user_id)
        api_key = models.ApiKey.get_by_object(dashboard)

        if api_key:
            api_key.active = False
            api_key.save()


