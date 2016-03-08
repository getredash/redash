from flask import request

from funcy import distinct, take
from itertools import chain

from redash import models
from redash.wsgi import api
from redash.permissions import require_permission
from redash.handlers.base import BaseResource, get_object_or_404


class DashboardRecentAPI(BaseResource):
    def get(self):
        recent = [d.to_dict() for d in models.Dashboard.recent(self.current_org, self.current_user.id)]

        global_recent = []
        if len(recent) < 10:
            global_recent = [d.to_dict() for d in models.Dashboard.recent(self.current_org)]

        return take(20, distinct(chain(recent, global_recent), key=lambda d: d['id']))


class DashboardListAPI(BaseResource):
    def get(self):
        dashboards = [d.to_dict() for d in models.Dashboard.all(self.current_org)]

        return dashboards

    @require_permission('create_dashboard')
    def post(self):
        dashboard_properties = request.get_json(force=True)
        dashboard = models.Dashboard(name=dashboard_properties['name'],
                                     org=self.current_org,
                                     user=self.current_user,
                                     layout='[]')
        dashboard.save()
        return dashboard.to_dict()


class DashboardAPI(BaseResource):
    def get(self, dashboard_slug=None):
        dashboard = get_object_or_404(models.Dashboard.get_by_slug_and_org, dashboard_slug, self.current_org)

        return dashboard.to_dict(with_widgets=True, user=self.current_user)

    @require_permission('edit_dashboard')
    def post(self, dashboard_slug):
        dashboard_properties = request.get_json(force=True)
        # TODO: either convert all requests to use slugs or ids
        dashboard = models.Dashboard.get_by_id_and_org(dashboard_slug, self.current_org)
        dashboard.layout = dashboard_properties['layout']
        dashboard.name = dashboard_properties['name']
        dashboard.save()

        return dashboard.to_dict(with_widgets=True, user=self.current_user)

    @require_permission('edit_dashboard')
    def delete(self, dashboard_slug):
        dashboard = models.Dashboard.get_by_slug_and_org(dashboard_slug, self.current_org)
        dashboard.is_archived = True
        dashboard.save()

        return dashboard.to_dict(with_widgets=True, user=self.current_user)

api.add_org_resource(DashboardListAPI, '/api/dashboards', endpoint='dashboards')
api.add_org_resource(DashboardRecentAPI, '/api/dashboards/recent', endpoint='recent_dashboards')
api.add_org_resource(DashboardAPI, '/api/dashboards/<dashboard_slug>', endpoint='dashboard')
