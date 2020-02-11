from flask import jsonify, request, Response
from flask_login import login_required
import requests

from redash.handlers.api import api
from redash.handlers.base import routes
from redash.monitor import get_status
from redash.permissions import require_super_admin
from redash.security import talisman


@routes.route("/ping", methods=["GET"])
@talisman(force_https=False)
def ping():
    return "PONG."


@routes.route("/status.json")
@login_required
@require_super_admin
def status_api():
    status = get_status()
    return jsonify(status)


@routes.route("/api/resource-proxy", methods=["GET"])
def resource_proxy():
    response = requests.get(request.args.get('url'))
    allow_headers = ['content-type']
    headers = [(name, value) for (name, value) in response.raw.headers.items() if name.lower() in allow_headers]
    return Response(response.content, response.status_code, headers)


def init_app(app):
    from redash.handlers import (
        embed,
        queries,
        static,
        authentication,
        admin,
        setup,
        organization,
    )

    app.register_blueprint(routes)
    api.init_app(app)
