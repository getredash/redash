from flask import jsonify, redirect
from flask_login import login_required, current_user

from redash.handlers.api import api
from redash.handlers.base import routes
from redash.handlers.static import render_index
from redash.monitor import get_status
from redash.permissions import require_super_admin
from redash import settings


@routes.route('/ping', methods=['GET'])
def ping():
    return 'PONG.'


@routes.route('/', methods=['GET'])
def default_route():
    if settings.MULTI_ORG:
        return redirect("/default/", code=302)
    elif current_user.is_authenticated:
        return render_index()
    else:
        return redirect("/login/", code=302)


@routes.route('/status.json')
@login_required
@require_super_admin
def status_api():
    status = get_status()
    return jsonify(status)


def init_app(app):
    from redash.handlers import embed, queries, static, authentication, admin, setup, organization
    app.register_blueprint(routes)
    api.init_app(app)
