import json

from funcy import project
from flask import render_template, request
from flask_login import login_required, current_user
from flask_restful import abort

from redash import models, settings
from redash import serializers
from redash.utils import json_dumps
from redash.handlers import routes
from redash.handlers.base import org_scoped_rule, record_event
from redash.permissions import require_access, view_only
from authentication import current_org


@routes.route(org_scoped_rule('/embed/query/<query_id>/visualization/<visualization_id>'), methods=['GET'])
@login_required
def embed(query_id, visualization_id, org_slug=None):
    query = models.Query.get_by_id_and_org(query_id, current_org)
    require_access(query.groups, current_user, view_only)
    vis = query.visualizations.where(models.Visualization.id == visualization_id).first()
    qr = {}

    if vis is not None:
        vis = vis.to_dict()
        qr = query.latest_query_data
        if qr is None:
            abort(400, message="No Results for this query")
        else:
            qr = qr.to_dict()
    else:
        abort(404, message="Visualization not found.")

    record_event(current_org, current_user, {
        'action': 'view',
        'object_id': visualization_id,
        'object_type': 'visualization',
        'query_id': query_id,
        'embed': True,
        'referer': request.headers.get('Referer')
    })

    client_config = {}
    client_config.update(settings.COMMON_CLIENT_CONFIG)

    qr = project(qr, ('data', 'id', 'retrieved_at'))
    vis = project(vis, ('description', 'name', 'id', 'options', 'query', 'type', 'updated_at'))
    vis['query'] = project(vis['query'], ('created_at', 'description', 'name', 'id', 'latest_query_data_id', 'name', 'updated_at'))

    return render_template("embed.html",
                           client_config=json_dumps(client_config),
                           visualization=json_dumps(vis),
                           query_result=json_dumps(qr))


@routes.route(org_scoped_rule('/public/dashboards/<token>'), methods=['GET'])
@login_required
def public_dashboard(token, org_slug=None):
    # TODO: verify object is a dashboard?
    if not isinstance(current_user, models.ApiUser):
        api_key = models.ApiKey.get_by_api_key(token)
        dashboard = api_key.object
    else:
        dashboard = current_user.object

    user = {
        'permissions': [],
        'apiKey': current_user.id
    }

    headers = {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate'
    }

    record_event(current_org, current_user, {
        'action': 'view',
        'object_id': dashboard.id,
        'object_type': 'dashboard',
        'public': True,
        'headless': 'embed' in request.args,
        'referer': request.headers.get('Referer')
    })

    response = render_template("public.html",
                               headless='embed' in request.args,
                               user=json.dumps(user),
                               seed_data=json_dumps({
                                 'dashboard': serializers.public_dashboard(dashboard)
                               }),
                               client_config=json.dumps(settings.COMMON_CLIENT_CONFIG))

    return response, 200, headers
