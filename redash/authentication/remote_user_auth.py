import logging
from flask import redirect, url_for, Blueprint, request
from redash.authentication.google_oauth import create_and_login_user
from redash.authentication.org_resolving import current_org
from redash import settings

logger = logging.getLogger('remote_user_auth')

blueprint = Blueprint('remote_user_auth', __name__)

@blueprint.route("/remote_user/login")
def login():
    next_path = request.args.get('next')

    if not settings.REMOTE_USER_LOGIN_ENABLED:
        logger.error("Cannot use remote user for login without being enabled in settings")
        return redirect(url_for('redash.index', next=next_path))

    email = request.headers.get(settings.REMOTE_USER_HEADER)

    # Some Apache auth configurations will, stupidly, set (null) instead of a
    # falsey value.  Special case that here so it Just Works for more installs.
    # '(null)' should never really be a value that anyone wants to legitimately
    # use as a redash user email.
    if email == '(null)':
        email = None

    if not email:
        logger.error("Cannot use remote user for login when it's not provided in the request (looked in headers['" + settings.REMOTE_USER_HEADER + "'])")
        return redirect(url_for('redash.index', next=next_path))

    logger.info("Logging in " + email + " via remote user")
    create_and_login_user(current_org, email, email)
    return redirect(next_path or url_for('redash.index'), code=302)
