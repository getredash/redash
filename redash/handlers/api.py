from flask_restful import Api
from werkzeug.wrappers import Response
from flask import make_response

from redash.utils import json_dumps
from redash.handlers.base import org_scoped_rule
from redash.handlers.permissions import ObjectPermissionsListResource, CheckPermissionResource
from redash.handlers.alerts import AlertResource, AlertListResource, AlertSubscriptionListResource, AlertSubscriptionResource
from redash.handlers.dashboards import DashboardListResource, RecentDashboardsResource, DashboardResource, DashboardShareResource, PublicDashboardResource 
from redash.handlers.data_sources import DataSourceTypeListResource, DataSourceListResource, DataSourceSchemaResource, DataSourceResource, DataSourcePauseResource, DataSourceTestResource
from redash.handlers.events import EventResource
from redash.handlers.queries import QueryForkResource, QueryRefreshResource, QueryListResource, QueryRecentResource, QuerySearchResource, QueryResource, MyQueriesResource
from redash.handlers.query_results import QueryResultListResource, QueryResultResource, JobResource
from redash.handlers.users import UserResource, UserListResource, UserInviteResource, UserResetPasswordResource
from redash.handlers.visualizations import VisualizationListResource
from redash.handlers.visualizations import VisualizationResource
from redash.handlers.widgets import WidgetResource, WidgetListResource
from redash.handlers.groups import GroupListResource, GroupResource, GroupMemberListResource, GroupMemberResource, \
    GroupDataSourceListResource, GroupDataSourceResource
from redash.handlers.destinations import DestinationTypeListResource, DestinationResource, DestinationListResource
from redash.handlers.query_snippets import QuerySnippetListResource, QuerySnippetResource


class ApiExt(Api):
    def add_org_resource(self, resource, *urls, **kwargs):
        urls = [org_scoped_rule(url) for url in urls]
        return self.add_resource(resource, *urls, **kwargs)

api = ApiExt()


@api.representation('application/json')
def json_representation(data, code, headers=None):
    # Flask-Restful checks only for flask.Response but flask-login uses werkzeug.wrappers.Response
    if isinstance(data, Response):
        return data
    resp = make_response(json_dumps(data), code)
    resp.headers.extend(headers or {})
    return resp


api.add_org_resource(AlertResource, '/api/alerts/<alert_id>', endpoint='alert')
api.add_org_resource(AlertSubscriptionListResource, '/api/alerts/<alert_id>/subscriptions', endpoint='alert_subscriptions')
api.add_org_resource(AlertSubscriptionResource, '/api/alerts/<alert_id>/subscriptions/<subscriber_id>', endpoint='alert_subscription')
api.add_org_resource(AlertListResource, '/api/alerts', endpoint='alerts')

api.add_org_resource(DashboardListResource, '/api/dashboards', endpoint='dashboards')
api.add_org_resource(RecentDashboardsResource, '/api/dashboards/recent', endpoint='recent_dashboards')
api.add_org_resource(DashboardResource, '/api/dashboards/<dashboard_slug>', endpoint='dashboard')
api.add_org_resource(PublicDashboardResource, '/api/dashboards/public/<token>', endpoint='public_dashboard')
api.add_org_resource(DashboardShareResource, '/api/dashboards/<dashboard_id>/share', endpoint='dashboard_share')

api.add_org_resource(DataSourceTypeListResource, '/api/data_sources/types', endpoint='data_source_types')
api.add_org_resource(DataSourceListResource, '/api/data_sources', endpoint='data_sources')
api.add_org_resource(DataSourceSchemaResource, '/api/data_sources/<data_source_id>/schema')
api.add_org_resource(DataSourcePauseResource, '/api/data_sources/<data_source_id>/pause')
api.add_org_resource(DataSourceTestResource, '/api/data_sources/<data_source_id>/test')
api.add_org_resource(DataSourceResource, '/api/data_sources/<data_source_id>', endpoint='data_source')

api.add_org_resource(GroupListResource, '/api/groups', endpoint='groups')
api.add_org_resource(GroupResource, '/api/groups/<group_id>', endpoint='group')
api.add_org_resource(GroupMemberListResource, '/api/groups/<group_id>/members', endpoint='group_members')
api.add_org_resource(GroupMemberResource, '/api/groups/<group_id>/members/<user_id>', endpoint='group_member')
api.add_org_resource(GroupDataSourceListResource, '/api/groups/<group_id>/data_sources', endpoint='group_data_sources')
api.add_org_resource(GroupDataSourceResource, '/api/groups/<group_id>/data_sources/<data_source_id>', endpoint='group_data_source')

api.add_org_resource(EventResource, '/api/events', endpoint='events')

api.add_org_resource(QuerySearchResource, '/api/queries/search', endpoint='queries_search')
api.add_org_resource(QueryRecentResource, '/api/queries/recent', endpoint='recent_queries')
api.add_org_resource(QueryListResource, '/api/queries', endpoint='queries')
api.add_org_resource(MyQueriesResource, '/api/queries/my', endpoint='my_queries')
api.add_org_resource(QueryRefreshResource, '/api/queries/<query_id>/refresh', endpoint='query_refresh')
api.add_org_resource(QueryResource, '/api/queries/<query_id>', endpoint='query')
api.add_org_resource(QueryForkResource, '/api/queries/<query_id>/fork', endpoint='query_fork')

api.add_org_resource(ObjectPermissionsListResource, '/api/<object_type>/<object_id>/acl', endpoint='object_permissions')
api.add_org_resource(CheckPermissionResource, '/api/<object_type>/<object_id>/acl/<access_type>', endpoint='check_permissions')

api.add_org_resource(QueryResultListResource, '/api/query_results', endpoint='query_results')
api.add_org_resource(QueryResultResource,
                     '/api/query_results/<query_result_id>',
                     '/api/queries/<query_id>/results.<filetype>',
                     '/api/queries/<query_id>/results/<query_result_id>.<filetype>',
                     endpoint='query_result')
api.add_org_resource(JobResource, '/api/jobs/<job_id>', endpoint='job')

api.add_org_resource(UserListResource, '/api/users', endpoint='users')
api.add_org_resource(UserResource, '/api/users/<user_id>', endpoint='user')
api.add_org_resource(UserInviteResource, '/api/users/<user_id>/invite', endpoint='user_invite')
api.add_org_resource(UserResetPasswordResource, '/api/users/<user_id>/reset_password', endpoint='user_reset_password')

api.add_org_resource(VisualizationListResource, '/api/visualizations', endpoint='visualizations')
api.add_org_resource(VisualizationResource, '/api/visualizations/<visualization_id>', endpoint='visualization')

api.add_org_resource(WidgetListResource, '/api/widgets', endpoint='widgets')
api.add_org_resource(WidgetResource, '/api/widgets/<int:widget_id>', endpoint='widget')

api.add_org_resource(DestinationTypeListResource, '/api/destinations/types', endpoint='destination_types')
api.add_org_resource(DestinationResource, '/api/destinations/<destination_id>', endpoint='destination')
api.add_org_resource(DestinationListResource, '/api/destinations', endpoint='destinations')

api.add_org_resource(QuerySnippetResource, '/api/query_snippets/<snippet_id>', endpoint='query_snippet')
api.add_org_resource(QuerySnippetListResource, '/api/query_snippets', endpoint='query_snippets')
