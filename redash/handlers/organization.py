from flask_login import current_user, login_required

from redash import models
from redash.authentication import current_org
from redash.handlers import routes
from redash.handlers.base import json_response, org_scoped_rule


@routes.route(org_scoped_rule("/api/organization/status"), methods=["GET"])
@login_required
def organization_status(org_slug=None):
    from redash.permissions import filter_by_object_permissions
    
    # Get base queries
    queries = models.Query.all_queries(current_user.group_ids, current_user.id, include_drafts=True)
    dashboards = models.Dashboard.query.filter(
        models.Dashboard.org == current_org, models.Dashboard.is_archived.is_(False)
    )
    
    # Apply object-level permission filtering
    queries = filter_by_object_permissions(queries, current_user, "Query", "read")
    dashboards = filter_by_object_permissions(dashboards, current_user, "Dashboard", "read")
    
    counters = {
        "users": models.User.all(current_org).count(),
        "alerts": models.Alert.all(group_ids=current_user.group_ids).count(),
        "data_sources": models.DataSource.all(current_org, group_ids=current_user.group_ids).count(),
        "queries": queries.count(),
        "dashboards": dashboards.count(),
    }

    return json_response(dict(object_counters=counters))
