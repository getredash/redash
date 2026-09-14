from flask import Blueprint

from redash_global.views.assignments import (
    assignment_create,
    assignment_delete,
    assignments_list,
)
from redash_global.views.auth import login_page, logout_page
from redash_global.views.composed_dashboards import (
    composed_dashboard_create,
    composed_dashboard_delete,
    composed_dashboard_deploy,
    composed_dashboard_deployment_runs_list,
    composed_dashboard_detail,
    composed_dashboard_entries_list,
    composed_dashboard_entries_reorder,
    composed_dashboard_entry_create,
    composed_dashboard_entry_delete,
    composed_dashboards_list,
)
from redash_global.views.index import index_view, spa_catch_all
from redash_global.views.organizations import organizations_list
from redash_global.views.subdashboards import sub_dashboards_list

global_blueprint = Blueprint("global", __name__)

global_blueprint.add_url_rule("/", methods=["GET"], view_func=index_view, endpoint="index")
global_blueprint.add_url_rule("/login", methods=["GET", "POST"], view_func=login_page, endpoint="login")
global_blueprint.add_url_rule("/logout", methods=["GET"], view_func=logout_page, endpoint="logout")

global_blueprint.add_url_rule(
    "/global-api/sub-dashboards",
    methods=["GET"],
    view_func=sub_dashboards_list,
    endpoint="sub_dashboards_list",
)

global_blueprint.add_url_rule(
    "/global-api/organizations",
    methods=["GET"],
    view_func=organizations_list,
    endpoint="organizations_list",
)

global_blueprint.add_url_rule(
    "/global-api/sub-dashboards/<int:dashboard_id>/assignments",
    methods=["GET"],
    view_func=assignments_list,
    endpoint="assignments_list",
)

global_blueprint.add_url_rule(
    "/global-api/sub-dashboards/<int:dashboard_id>/assignments",
    methods=["POST"],
    view_func=assignment_create,
    endpoint="assignment_create",
)

global_blueprint.add_url_rule(
    "/global-api/sub-dashboards/<int:dashboard_id>/assignments/<int:assignment_id>",
    methods=["DELETE"],
    view_func=assignment_delete,
    endpoint="assignment_delete",
)


global_blueprint.add_url_rule(
    "/global-api/composed-dashboards",
    methods=["GET"],
    view_func=composed_dashboards_list,
    endpoint="composed_dashboards_list",
)

global_blueprint.add_url_rule(
    "/global-api/composed-dashboards",
    methods=["POST"],
    view_func=composed_dashboard_create,
    endpoint="composed_dashboard_create",
)

global_blueprint.add_url_rule(
    "/global-api/composed-dashboards/<int:composed_dashboard_id>",
    methods=["GET"],
    view_func=composed_dashboard_detail,
    endpoint="composed_dashboard_detail",
)

global_blueprint.add_url_rule(
    "/global-api/composed-dashboards/<int:composed_dashboard_id>",
    methods=["DELETE"],
    view_func=composed_dashboard_delete,
    endpoint="composed_dashboard_delete",
)

global_blueprint.add_url_rule(
    "/global-api/composed-dashboards/<int:composed_dashboard_id>/deploy",
    methods=["POST"],
    view_func=composed_dashboard_deploy,
    endpoint="composed_dashboard_deploy",
)

global_blueprint.add_url_rule(
    "/global-api/composed-dashboards/<int:composed_dashboard_id>/deployment-runs",
    methods=["GET"],
    view_func=composed_dashboard_deployment_runs_list,
    endpoint="composed_dashboard_deployment_runs_list",
)

global_blueprint.add_url_rule(
    "/global-api/composed-dashboards/<int:composed_dashboard_id>/entries",
    methods=["GET"],
    view_func=composed_dashboard_entries_list,
    endpoint="composed_dashboard_entries_list",
)

global_blueprint.add_url_rule(
    "/global-api/composed-dashboards/<int:composed_dashboard_id>/entries",
    methods=["POST"],
    view_func=composed_dashboard_entry_create,
    endpoint="composed_dashboard_entry_create",
)

global_blueprint.add_url_rule(
    "/global-api/composed-dashboards/<int:composed_dashboard_id>/entries/reorder",
    methods=["POST"],
    view_func=composed_dashboard_entries_reorder,
    endpoint="composed_dashboard_entries_reorder",
)

global_blueprint.add_url_rule(
    "/global-api/composed-dashboards/<int:composed_dashboard_id>/entries/<int:entry_id>",
    methods=["DELETE"],
    view_func=composed_dashboard_entry_delete,
    endpoint="composed_dashboard_entry_delete",
)

# Catch-all for client-side routes (e.g. /sub-dashboards). Must be registered
# last so it only matches paths no more-specific rule claimed. Werkzeug ranks
# rules by specificity, so /static, /login and /global-api/* still win.
global_blueprint.add_url_rule(
    "/<path:path>",
    methods=["GET"],
    view_func=spa_catch_all,
    endpoint="spa_catch_all",
)
