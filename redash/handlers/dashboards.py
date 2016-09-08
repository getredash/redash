import logging

from flask import request, url_for
from flask_restful import abort

from funcy import distinct, take
from itertools import chain

from redash import models
from redash.permissions import require_permission, require_admin_or_owner
from redash.handlers.base import BaseResource, get_object_or_404
import redash.permissions


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
        return dashboards

    @require_permission('create_dashboard')
    def post(self):
        dashboard_properties = request.get_json(force=True)
        dashboard = models.Dashboard(name=dashboard_properties['name'],
                                     org=self.current_org,
                                     user=self.current_user,
                                     layout='[]')

        new_change = dashboard.tracked_save(changing_user=self.current_user)

        result = dashboard.to_dict()
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

        return response

    @require_permission('edit_dashboard')
    def post(self, dashboard_slug):
        dashboard_properties = request.get_json(force=True)
        # TODO: either convert all requests to use slugs or ids
        dashboard = models.Dashboard.get_by_id_and_org(dashboard_slug, self.current_org)

        # check access permissions
        if not redash.permissions.is_admin_or_owner(object_owner_id=dashboard.user.id):
            if not self.current_user.has_access(
                    access_type=models.AccessPermission.ACCESS_TYPE_MODIFY,
                    object_id=dashboard.id,
                    object_type=models.Dashboard.__name__):
                abort(403)

        # Optimistic locking: figure out which user made the last
        # change to this dashboard, and bail out if necessary
        last_change = models.Change.get_latest(object_id=dashboard.id, object_type=models.Dashboard.__name__)
        if last_change and 'version' in dashboard_properties:
            if last_change.object_version > dashboard_properties['version']:
                abort(409) # HTTP 'Conflict' status code

        old_dashboard = {'name': dashboard.name, 'layout': dashboard.layout}
        dashboard.layout = dashboard_properties['layout']
        dashboard.name = dashboard_properties['name']
        new_change = dashboard.tracked_save(changing_user=self.current_user, old_object=old_dashboard)

        result = dashboard.to_dict(with_widgets=True, user=self.current_user)
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


