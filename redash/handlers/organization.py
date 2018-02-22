import json

from flask import request
from flask_login import login_required
from redash import models
from redash.handlers import routes
from redash.handlers.base import json_response
from redash.permissions import require_admin


@routes.route('/api/organization/status', methods=['GET'])
@require_admin
@login_required
def organization_status():
    counters = {
        'users': models.User.query.count(),
        'alerts': models.Alert.query.count(),
        'data_sources': models.DataSource.query.count(),
        # todo: not archived
        'queries': models.Query.query.count(),
        'dashboards': models.Dashboard.query.count(),
    }
    return json_response(dict(object_counters=counters))
