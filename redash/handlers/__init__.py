import os
from flask import jsonify
from flask_login import login_required

from redash.handlers.api import api
from redash.handlers.base import routes, add_cors_headers
from redash.monitor import get_status
from redash.permissions import require_super_admin
from redash.security import talisman
from redash.settings.helpers import set_from_string


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

    @app.after_request
    def add_header(response):
        ACCESS_CONTROL_ALLOW_ORIGIN = set_from_string(
            os.environ.get("REDASH_CORS_ACCESS_CONTROL_ALLOW_ORIGIN", "")
        )
        if len(ACCESS_CONTROL_ALLOW_ORIGIN) > 0:
            add_cors_headers(response.headers)
        return response
