import json

from flask import request
from flask_login import login_required
from redash import models
from redash.handlers import routes
from redash.handlers.base import json_response, org_scoped_rule
from redash.permissions import require_admin


@routes.route(org_scoped_rule('/api/organization/status'), methods=['GET'])
@login_required
def organization_status(org_slug=None):
    counters = {
        'users': models.User.query.count(),
        'alerts': models.Alert.query.count(),
        'data_sources': models.DataSource.query.count(),
        'queries': models.Query.query.filter(models.Query.is_archived==False).count(),
        'dashboards': models.Dashboard.query.filter(models.Dashboard.is_archived==False).count(),
    }
    return json_response(dict(object_counters=counters))
