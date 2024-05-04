from flask_login import current_user, login_required
from sqlalchemy import distinct, func

from redash import models
from redash.authentication import current_org
from redash.handlers import routes
from redash.handlers.base import json_response, org_scoped_rule


@routes.route(org_scoped_rule("/api/organization/status"), methods=["GET"])
@login_required
def organization_status(org_slug=None):
    counters = {
        "users": models.db.session.scalar(models.User.all(current_org, columns=[func.count(models.User.id)])),
        "alerts": models.db.session.scalar(
            models.Alert.all(group_ids=current_user.group_ids, columns=[func.count(models.Alert.id)], distinct=[])
        ),
        "data_sources": models.db.session.scalar(
            models.DataSource.all(
                current_org,
                group_ids=current_user.group_ids,
                columns=[func.count(models.DataSource.id)],
            )
        ),
        "queries": models.db.session.scalar(
            models.Query.all(
                current_user.group_ids,
                user_id=current_user.id,
                include_drafts=True,
                columns=[func.count(distinct(models.Query.id))],
            )
        ),
        "dashboards": models.db.session.scalar(
            models.Dashboard.all(
                current_org,
                [],
                None,
                columns=[func.count(distinct(models.Dashboard.id))],
                distinct=[],
            )
        ),
    }

    return json_response(dict(object_counters=counters))
