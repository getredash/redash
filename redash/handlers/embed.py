<<<<<<< HEAD
import json
=======
import logging
>>>>>>> upstream/master
import time

import pystache
from flask import request

from authentication import current_org
from flask_login import current_user, login_required
from flask_restful import abort
from redash import models, utils
from redash.handlers import routes
from redash.handlers.base import (get_object_or_404, org_scoped_rule,
                                  record_event)
from redash.handlers.query_results import collect_query_parameters, run_query_sync
from redash.permissions import require_access, view_only
from redash.utils import (collect_parameters_from_request, json_dumps)

@routes.route(org_scoped_rule('/embed/query/<query_id>/visualization/<visualization_id>'), methods=['GET'])
@login_required
def embed(query_id, visualization_id, org_slug=None):
    record_event(current_org, current_user._get_current_object(), {
        'action': 'view',
        'object_id': visualization_id,
        'object_type': 'visualization',
        'query_id': query_id,
        'embed': True,
        'referer': request.headers.get('Referer')
    })

    return render_index()

@routes.route(org_scoped_rule('/public/dashboards/<token>'), methods=['GET'])
@login_required
def public_dashboard(token, org_slug=None):
    if current_user.is_api_user():
        dashboard = current_user.object
    else:
        api_key = get_object_or_404(models.ApiKey.get_by_api_key, token)
        dashboard = api_key.object

    record_event(current_org, current_user, {
        'action': 'view',
        'object_id': dashboard.id,
        'object_type': 'dashboard',
        'public': True,
        'headless': 'embed' in request.args,
        'referer': request.headers.get('Referer')
    })
    return render_index()
