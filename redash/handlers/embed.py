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

    v = models.Visualization.get(models.Visualization.id == visualization_id)
    qr = {}
    if v:
        q = v.query
        if q.id == int(query_id):
            v = v.to_dict()
            query_result_id = q._data['latest_query_data']
            if query_result_id:
                qr = models.QueryResult.get_by_id(query_result_id)
                qr = qr.to_dict()
            else:
                abort(400, message="No Results for this query")
        else:
            logging.error("%r != %r" % (q.id,query_id))
            abort(404, message="Invalid visualization for query")
    else:
        abort(404, message="Visualization not found.")

    client_config = {
        'clientSideMetrics': settings.CLIENT_SIDE_METRICS,
        'allowScriptsInUserInput': settings.ALLOW_SCRIPTS_IN_USER_INPUT,
        'highChartsTurboThreshold': settings.HIGHCHARTS_TURBO_THRESHOLD,
        'dateFormat': settings.DATE_FORMAT,
        'dateTimeFormat': "{0} HH:mm".format(settings.DATE_FORMAT)
    }

    return render_template("embed.html",
                           name=settings.NAME,
                           client_config=json_dumps(client_config),
                           visualization=json_dumps(v),
                           query_result=json_dumps(qr),
                           analytics=settings.ANALYTICS)
