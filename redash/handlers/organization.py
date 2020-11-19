from flask_login import current_user, login_required
from flask import request
from redash import models
from redash.handlers import routes
from redash.handlers.base import json_response, org_scoped_rule
from redash.authentication import current_org


@routes.route(org_scoped_rule("/api/organization/status"), methods=["GET"])
@login_required
def organization_status(org_slug=None):
    counters = {
        "users": models.User.all(current_org).count(),
        "alerts": models.Alert.all(group_ids=current_user.group_ids).count(),
        "data_sources": models.DataSource.all(
            current_org, group_ids=current_user.group_ids
        ).count(),
        "queries": models.Query.all_queries(
            current_user.group_ids, current_user.id, include_drafts=True
        ).count(),
        "dashboards": models.Dashboard.query.filter(
            models.Dashboard.org == current_org, models.Dashboard.is_archived == False
        ).count(),
    }

    return json_response(dict(object_counters=counters))

@routes.route(org_scoped_rule("/api/organization/CreateOrg"), methods=["post"])
def organization_create_org(org_slug=None):
    org_name=request.json["org_slug"]
    orgexist= models.Organization.get_by_slug(org_name)
    if orgexist is not None:
        return json_response("OK")
    else :
        default_org = models.Organization(name=org_name, slug=org_name, settings={})
        admin_group = models.Group(
            name="admin",
            permissions=["admin", "super_admin"],
            org=default_org,
            type=models.Group.BUILTIN_GROUP,
        )
        default_group = models.Group(
            name="default",
            permissions=models.Group.DEFAULT_PERMISSIONS,
            org=default_org,
            type=models.Group.BUILTIN_GROUP,
        )

        models.db.session.add_all([default_org, admin_group, default_group])
        models.db.session.commit()

        user = models.User(
            org=default_org,
            name="admin",
            email="admin@"+org_name+".com",
            group_ids=[admin_group.id, default_group.id],
        )
        user.hash_password(org_name)

        models.db.session.add(user)
        models.db.session.commit()
        return json_response("OK")

