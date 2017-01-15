import json
import time

import pystache
from authentication import current_org
from flask import current_app, render_template, request, safe_join, send_file
from flask_login import current_user, login_required
from flask_restful import abort
from funcy import project
from redash import models, serializers, settings, utils
from redash.handlers import routes
from redash.handlers.base import (get_object_or_404, org_scoped_rule,
                                  record_event)
from redash.handlers.query_results import collect_query_parameters, run_query_sync
from redash.permissions import require_access, view_only
from redash.utils import (collect_parameters_from_request, json_dumps)



@routes.route(org_scoped_rule('/embed/query/<query_id>/visualization/<visualization_id>'), methods=['GET'])
@login_required
def embed(query_id, visualization_id, org_slug=None):
    record_event(current_org, current_user, {
        'action': 'view',
        'object_id': visualization_id,
        'object_type': 'visualization',
        'query_id': query_id,
        'embed': True,
        'referer': request.headers.get('Referer')
    })

    full_path = safe_join(settings.STATIC_ASSETS_PATHS[-2], 'index.html')
    models.db.session.commit()
    return send_file(full_path, **dict(cache_timeout=0, conditional=True))

@routes.route(org_scoped_rule('/public/dashboards/<token>'), methods=['GET'])
@login_required
def public_dashboard(token, org_slug=None):
    # TODO: bring this back.
    # record_event(current_org, current_user, {
    #     'action': 'view',
    #     'object_id': dashboard.id,
    #     'object_type': 'dashboard',
    #     'public': True,
    #     'headless': 'embed' in request.args,
    #     'referer': request.headers.get('Referer')
    # })
    # models.db.session.commit()
    full_path = safe_join(settings.STATIC_ASSETS_PATHS[-2], 'index.html')
    return send_file(full_path, **dict(cache_timeout=0, conditional=True))
