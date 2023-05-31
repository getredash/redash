import logging
from flask import url_for, Blueprint, request, redirect
from flask_oauthlib.client import OAuth, OAuthException
from flask_login import login_required, current_user
from redash import settings

logger = logging.getLogger('bigquery_oauth2')

blueprint = Blueprint('bigquery_oauth2', __name__)


def get_google_oauth():
    oauth = OAuth()
    google = oauth.remote_app(
        'google',
        consumer_key=settings.GOOGLE_CLIENT_ID,
        consumer_secret=settings.GOOGLE_CLIENT_SECRET,
        request_token_params={
            'scope': 'https://www.googleapis.com/auth/bigquery',
            'access_type': 'offline',
            'prompt': 'consent',
        },
        base_url='https://www.googleapis.com/oauth2/v1/',
        request_token_url=None,
        access_token_method='POST',
        access_token_url='https://accounts.google.com/o/oauth2/token',
        authorize_url='https://accounts.google.com/o/oauth2/auth',
    )
    return google


@blueprint.route('/bqauthorize', endpoint="bqauthorize")
@login_required
def bqauthorize():
    google = get_google_oauth()
    return google.authorize(callback=url_for(".bqauthorized", _external=True))


@blueprint.route('/bqauthorized', endpoint="bqauthorized")
@login_required
def bqauthorized():
    google = get_google_oauth()
    resp = None
    try:
        resp = google.authorized_response()
    except OAuthException as ex:
        logger.exception("oauth exception, current_user: %s, data: %s, ex: %s ", current_user, ex.data, ex)
        return str(ex.data), 500

    if resp is None:
        return 'Access denied: reason=%s error=%s' % (
            request.args['error_reason'],
            request.args['error_description']
        )
    current_user.update_credentials('bq_oauth_refresh_token', resp["refresh_token"])

    return redirect(url_for("redash.index"))