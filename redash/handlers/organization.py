from flask_login import current_user, login_required
from sqlalchemy import distinct, func
from sqlalchemy.sql.expression import select

from redash import models
from redash.authentication import current_org
from redash.handlers import routes
from redash.handlers.base import json_response, org_scoped_rule


@routes.route(org_scoped_rule("/api/organization/status"), methods=["GET"])
@login_required
def organization_status(org_slug=None):
    counters = {
        "users": models.db.session.execute(
            models.User.all(current_org, columns=[func.count(models.User.id)])
        ).first()[0],
        "alerts": models.db.session.execute(
            models.Alert.all(
                group_ids=current_user.group_ids, columns=[func.count(models.Alert.id)], distinct=[]
            )
        ).first()[0],
        "data_sources": models.db.session.execute(
            models.DataSource.all(
                current_org,
                group_ids=current_user.group_ids,
                columns=[func.count(models.DataSource.id)],
            )
        ).first()[0],
        "queries": models.db.session.execute(
            models.Query.all(
                current_user.group_ids,
                user_id=current_user.id,
                include_drafts=True,
                columns=[func.count(distinct(models.Query.id))],
            )
        ).first()[0],
        "dashboards": models.db.session.execute(
            select(func.count(models.Dashboard.id)).where(
                models.Dashboard.org == current_org, models.Dashboard.is_archived.is_(False)
            )
        ).first()[0],
    }

    return json_response(dict(object_counters=counters))
