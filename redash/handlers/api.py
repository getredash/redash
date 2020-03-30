from flask import make_response
from flask_restful import Api
from werkzeug.wrappers import Response

from redash.handlers.alerts import (
    AlertListResource,
    AlertResource,
    AlertMuteResource,
    AlertSubscriptionListResource,
    AlertSubscriptionResource,
)
from redash.handlers.base import org_scoped_rule
from redash.handlers.dashboards import (
    DashboardFavoriteListResource,
    DashboardListResource,
    DashboardResource,
    DashboardShareResource,
    DashboardTagsResource,
    PublicDashboardResource,
)
from redash.handlers.data_sources import (
    DataSourceListResource,
    DataSourcePauseResource,
    DataSourceResource,
    DataSourceSchemaResource,
    DataSourceTestResource,
    DataSourceTypeListResource,
)
from redash.handlers.destinations import (
    DestinationListResource,
    DestinationResource,
    DestinationTypeListResource,
)
from redash.handlers.events import EventsResource
from redash.handlers.favorites import DashboardFavoriteResource, QueryFavoriteResource
from redash.handlers.groups import (
    GroupDataSourceListResource,
    GroupDataSourceResource,
    GroupListResource,
    GroupMemberListResource,
    GroupMemberResource,
    GroupResource,
)
from redash.handlers.permissions import (
    CheckPermissionResource,
    ObjectPermissionsListResource,
)
from redash.handlers.queries import (
    MyQueriesResource,
    QueryArchiveResource,
    QueryFavoriteListResource,
    QueryForkResource,
    QueryListResource,
    QueryRecentResource,
    QueryRefreshResource,
    QueryResource,
    QuerySearchResource,
    QueryTagsResource,
    QueryRegenerateApiKeyResource,
)
from redash.handlers.query_results import (
    JobResource,
    QueryResultDropdownResource,
    QueryDropdownsResource,
    QueryResultListResource,
    QueryResultResource,
)
from redash.handlers.query_snippets import (
    QuerySnippetListResource,
    QuerySnippetResource,
)
from redash.handlers.settings import OrganizationSettings
from redash.handlers.users import (
    UserDisableResource,
    UserInviteResource,
    UserListResource,
    UserRegenerateApiKeyResource,
    UserResetPasswordResource,
    UserResource,
)
from redash.handlers.visualizations import (
    VisualizationListResource,
    VisualizationResource,
)
from redash.handlers.widgets import WidgetListResource, WidgetResource
from redash.utils import json_dumps


class ApiExt(Api):
    def add_org_resource(self, resource, *urls, **kwargs):
        urls = [org_scoped_rule(url) for url in urls]
        return self.add_resource(resource, *urls, **kwargs)


api = ApiExt()


@api.representation("application/json")
def json_representation(data, code, headers=None):
    # Flask-Restful checks only for flask.Response but flask-login uses werkzeug.wrappers.Response
    if isinstance(data, Response):
        return data
    resp = make_response(json_dumps(data), code)
    resp.headers.extend(headers or {})
    return resp


api.add_org_resource(AlertResource, "/api/alerts/<alert_id>", endpoint="alert")
api.add_org_resource(
    AlertMuteResource, "/api/alerts/<alert_id>/mute", endpoint="alert_mute"
)
api.add_org_resource(
    AlertSubscriptionListResource,
    "/api/alerts/<alert_id>/subscriptions",
    endpoint="alert_subscriptions",
)
api.add_org_resource(
    AlertSubscriptionResource,
    "/api/alerts/<alert_id>/subscriptions/<subscriber_id>",
    endpoint="alert_subscription",
)
api.add_org_resource(AlertListResource, "/api/alerts", endpoint="alerts")

api.add_org_resource(DashboardListResource, "/api/dashboards", endpoint="dashboards")
api.add_org_resource(
    DashboardResource, "/api/dashboards/<dashboard_slug>", endpoint="dashboard"
)
api.add_org_resource(
    PublicDashboardResource,
    "/api/dashboards/public/<token>",
    endpoint="public_dashboard",
)
api.add_org_resource(
    DashboardShareResource,
    "/api/dashboards/<dashboard_id>/share",
    endpoint="dashboard_share",
)

api.add_org_resource(
    DataSourceTypeListResource, "/api/data_sources/types", endpoint="data_source_types"
)
api.add_org_resource(
    DataSourceListResource, "/api/data_sources", endpoint="data_sources"
)
api.add_org_resource(
    DataSourceSchemaResource, "/api/data_sources/<data_source_id>/schema"
)
api.add_org_resource(
    DataSourcePauseResource, "/api/data_sources/<data_source_id>/pause"
)
api.add_org_resource(DataSourceTestResource, "/api/data_sources/<data_source_id>/test")
api.add_org_resource(
    DataSourceResource, "/api/data_sources/<data_source_id>", endpoint="data_source"
)

api.add_org_resource(GroupListResource, "/api/groups", endpoint="groups")
api.add_org_resource(GroupResource, "/api/groups/<group_id>", endpoint="group")
api.add_org_resource(
    GroupMemberListResource, "/api/groups/<group_id>/members", endpoint="group_members"
)
api.add_org_resource(
    GroupMemberResource,
    "/api/groups/<group_id>/members/<user_id>",
    endpoint="group_member",
)
api.add_org_resource(
    GroupDataSourceListResource,
    "/api/groups/<group_id>/data_sources",
    endpoint="group_data_sources",
)
api.add_org_resource(
    GroupDataSourceResource,
    "/api/groups/<group_id>/data_sources/<data_source_id>",
    endpoint="group_data_source",
)

api.add_org_resource(EventsResource, "/api/events", endpoint="events")

api.add_org_resource(
    QueryFavoriteListResource, "/api/queries/favorites", endpoint="query_favorites"
)
api.add_org_resource(
    QueryFavoriteResource, "/api/queries/<query_id>/favorite", endpoint="query_favorite"
)
api.add_org_resource(
    DashboardFavoriteListResource,
    "/api/dashboards/favorites",
    endpoint="dashboard_favorites",
)
api.add_org_resource(
    DashboardFavoriteResource,
    "/api/dashboards/<object_id>/favorite",
    endpoint="dashboard_favorite",
)

api.add_org_resource(QueryTagsResource, "/api/queries/tags", endpoint="query_tags")
api.add_org_resource(
    DashboardTagsResource, "/api/dashboards/tags", endpoint="dashboard_tags"
)

api.add_org_resource(
    QuerySearchResource, "/api/queries/search", endpoint="queries_search"
)
api.add_org_resource(
    QueryRecentResource, "/api/queries/recent", endpoint="recent_queries"
)
api.add_org_resource(
    QueryArchiveResource, "/api/queries/archive", endpoint="queries_archive"
)
api.add_org_resource(QueryListResource, "/api/queries", endpoint="queries")
api.add_org_resource(MyQueriesResource, "/api/queries/my", endpoint="my_queries")
api.add_org_resource(
    QueryRefreshResource, "/api/queries/<query_id>/refresh", endpoint="query_refresh"
)
api.add_org_resource(QueryResource, "/api/queries/<query_id>", endpoint="query")
api.add_org_resource(
    QueryForkResource, "/api/queries/<query_id>/fork", endpoint="query_fork"
)
api.add_org_resource(
    QueryRegenerateApiKeyResource,
    "/api/queries/<query_id>/regenerate_api_key",
    endpoint="query_regenerate_api_key",
)

api.add_org_resource(
    ObjectPermissionsListResource,
    "/api/<object_type>/<object_id>/acl",
    endpoint="object_permissions",
)
api.add_org_resource(
    CheckPermissionResource,
    "/api/<object_type>/<object_id>/acl/<access_type>",
    endpoint="check_permissions",
)

api.add_org_resource(
    QueryResultListResource, "/api/query_results", endpoint="query_results"
)
api.add_org_resource(
    QueryResultDropdownResource,
    "/api/queries/<query_id>/dropdown",
    endpoint="query_result_dropdown",
)
api.add_org_resource(
    QueryDropdownsResource,
    "/api/queries/<query_id>/dropdowns/<dropdown_query_id>",
    endpoint="query_result_dropdowns",
)
api.add_org_resource(
    QueryResultResource,
    "/api/query_results/<query_result_id>.<filetype>",
    "/api/query_results/<query_result_id>",
    "/api/queries/<query_id>/results",
    "/api/queries/<query_id>/results.<filetype>",
    "/api/queries/<query_id>/results/<query_result_id>.<filetype>",
    endpoint="query_result",
)
api.add_org_resource(
    JobResource,
    "/api/jobs/<job_id>",
    "/api/queries/<query_id>/jobs/<job_id>",
    endpoint="job",
)

api.add_org_resource(UserListResource, "/api/users", endpoint="users")
api.add_org_resource(UserResource, "/api/users/<user_id>", endpoint="user")
api.add_org_resource(
    UserInviteResource, "/api/users/<user_id>/invite", endpoint="user_invite"
)
api.add_org_resource(
    UserResetPasswordResource,
    "/api/users/<user_id>/reset_password",
    endpoint="user_reset_password",
)
api.add_org_resource(
    UserRegenerateApiKeyResource,
    "/api/users/<user_id>/regenerate_api_key",
    endpoint="user_regenerate_api_key",
)
api.add_org_resource(
    UserDisableResource, "/api/users/<user_id>/disable", endpoint="user_disable"
)

api.add_org_resource(
    VisualizationListResource, "/api/visualizations", endpoint="visualizations"
)
api.add_org_resource(
    VisualizationResource,
    "/api/visualizations/<visualization_id>",
    endpoint="visualization",
)

api.add_org_resource(WidgetListResource, "/api/widgets", endpoint="widgets")
api.add_org_resource(WidgetResource, "/api/widgets/<int:widget_id>", endpoint="widget")

api.add_org_resource(
    DestinationTypeListResource, "/api/destinations/types", endpoint="destination_types"
)
api.add_org_resource(
    DestinationResource, "/api/destinations/<destination_id>", endpoint="destination"
)
api.add_org_resource(
    DestinationListResource, "/api/destinations", endpoint="destinations"
)

api.add_org_resource(
    QuerySnippetResource, "/api/query_snippets/<snippet_id>", endpoint="query_snippet"
)
api.add_org_resource(
    QuerySnippetListResource, "/api/query_snippets", endpoint="query_snippets"
)

api.add_org_resource(
    OrganizationSettings, "/api/settings/organization", endpoint="organization_settings"
)
