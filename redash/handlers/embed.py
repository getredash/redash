from funcy import project
from flask import render_template, url_for
from flask_login import login_required
from flask_restful import abort

from redash import models, settings
from redash.wsgi import app
from redash.utils import json_dumps
from redash.handlers import org_scoped_rule
from redash.authentication.org_resolving import current_org


@app.route(org_scoped_rule('/embed/query/<query_id>/visualization/<visualization_id>'), methods=['GET'])
@login_required
def embed(query_id, visualization_id, org_slug=None):
    # TODO: add event for embed access
    query = models.Query.get_by_id_and_org(query_id, current_org)
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

    client_config = {}
    client_config.update(settings.COMMON_CLIENT_CONFIG)

    qr = project(qr, ('data', 'id', 'retrieved_at'))
    vis = project(vis, ('description', 'name', 'id', 'options', 'query', 'type', 'updated_at'))
    vis['query'] = project(vis, ('created_at', 'description', 'name', 'id', 'latest_query_data_id', 'name', 'updated_at'))

    if settings.MULTI_ORG:
        base_href = url_for('index', _external=True, org_slug=current_org.slug)
    else:
        base_href = url_for('index', _external=True)

    return render_template("embed.html",
                           name=settings.NAME,
                           base_href=base_href,
                           client_config=json_dumps(client_config),
                           visualization=json_dumps(vis),
                           query_result=json_dumps(qr),
                           analytics=settings.ANALYTICS)
