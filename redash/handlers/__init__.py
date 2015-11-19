from flask import jsonify
from flask_login import login_required

from redash.wsgi import app
from redash.permissions import require_permission
from redash.monitor import get_status


@app.route('/ping', methods=['GET'])
def ping():
    return 'PONG.'


@app.route('/status.json')
@login_required
@require_permission('admin')
def status_api():
    status = get_status()

    return jsonify(status)


from redash.handlers import alerts, authentication, base, dashboards, data_sources, events, queries, query_results, \
    static, users, visualizations, widgets, embed
