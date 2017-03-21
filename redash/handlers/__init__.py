from flask import jsonify
from flask_login import login_required

from redash.handlers.api import api
from redash.handlers.base import routes
from redash.monitor import get_status
from redash.permissions import require_super_admin


@routes.route('/ping', methods=['GET'])
def ping():
    return 'PONG.'


@routes.route('/status.json')
@login_required
@require_super_admin
def status_api():
    status = get_status()
    return jsonify(status)


def init_app(app):
    from redash.handlers import embed, queries, static, authentication, admin, setup
    app.register_blueprint(routes)
    api.init_app(app)
