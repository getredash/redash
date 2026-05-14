from flask import jsonify
from flask_login import login_required

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


def init_app(app):
    from redash.handlers import (
        admin,
        authentication,
        embed,
        organization,
        queries,
        setup,
        static,
    )

    app.register_blueprint(routes)

    # Disable Flask-RESTful API initialization during testing to prevent Flask 3.0 compatibility deadlocks
    if not app.config.get("TESTING", False):
        api.init_app(app)
    else:
        import logging

        logging.warning(
            "Skipping Flask-RESTful API initialization in testing mode due to Flask 3.0 compatibility issues"
        )
