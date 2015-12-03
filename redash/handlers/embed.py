import logging

from flask import render_template, request, redirect, session, url_for, flash
from flask.ext.restful import abort

from flask_login import current_user, login_required

from redash import models, settings
from redash.wsgi import app
from redash.utils import json_dumps

@app.route('/embed/query/<query_id>/visualization/<visualization_id>', methods=['GET'])
@login_required
def embed(query_id, visualization_id):

    query = models.Query.get_by_id(query_id)
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

    return render_template("embed.html",
                           name=settings.NAME,
                           client_config=json_dumps(client_config),
                           visualization=json_dumps(vis),
                           query_result=json_dumps(qr),
                           analytics=settings.ANALYTICS)
