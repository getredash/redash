from flask import request, url_for
from flask_restful import abort

from funcy import distinct, take, project
from itertools import chain

from redash import models
from redash.models import ConflictDetectedError
from redash.permissions import require_permission, require_admin_or_owner, require_object_modify_permission, can_modify
from redash.handlers.base import BaseResource, get_object_or_404


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
        dashboard = models.Dashboard.create(name=dashboard_properties['name'],
                                            org=self.current_org,
                                            user=self.current_user,
                                            layout='[]')

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

        response['can_edit'] = can_modify(dashboard, self.current_user)

        return response

    @require_permission('edit_dashboard')
    def post(self, dashboard_slug):
        dashboard_properties = request.get_json(force=True)
        # TODO: either convert all requests to use slugs or ids
        dashboard = models.Dashboard.get_by_id_and_org(dashboard_slug, self.current_org)

        require_object_modify_permission(dashboard, self.current_user)

        updates = project(dashboard_properties, ('name', 'layout', 'version'))
        updates['changed_by'] = self.current_user

        try:
            dashboard.update_instance(**updates)
        except ConflictDetectedError:
            abort(409)

        result = dashboard.to_dict(with_widgets=True, user=self.current_user)
        return result

    @require_permission('edit_dashboard')
    def delete(self, dashboard_slug):
        dashboard = models.Dashboard.get_by_slug_and_org(dashboard_slug, self.current_org)
        dashboard.is_archived = True
        dashboard.save(changed_by=self.current_user)

        return dashboard.to_dict(with_widgets=True, user=self.current_user)


class DashboardShareResource(BaseResource):
    def post(self, dashboard_id):
        dashboard = models.Dashboard.get_by_id_and_org(dashboard_id, self.current_org)
        require_admin_or_owner(dashboard.user_id)
        api_key = models.ApiKey.create_for_object(dashboard, self.current_user)
        public_url = url_for('redash.public_dashboard', token=api_key.api_key, org_slug=self.current_org.slug, _external=True)

        self.record_event({
            'action': 'activate_api_key',
            'object_id': dashboard.id,
            'object_type': 'dashboard',
        })

        return {'public_url': public_url, 'api_key': api_key.api_key}

    def delete(self, dashboard_id):
        dashboard = models.Dashboard.get_by_id_and_org(dashboard_id, self.current_org)
        require_admin_or_owner(dashboard.user_id)
        api_key = models.ApiKey.get_by_object(dashboard)

        if api_key:
            api_key.active = False
            api_key.save()

        self.record_event({
            'action': 'deactivate_api_key',
            'object_id': dashboard.id,
            'object_type': 'dashboard',
        })


