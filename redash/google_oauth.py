import logging
from flask.ext.login import login_user
import requests
from flask import redirect, url_for, Blueprint
from flask_oauth import OAuth
from redash import models, settings

logger = logging.getLogger('google_oauth')
oauth = OAuth()

request_token_params = {'scope': 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile', 'response_type': 'code'}

if settings.GOOGLE_APPS_DOMAIN:
    request_token_params['hd'] = settings.GOOGLE_APPS_DOMAIN
else:
    logger.warning("No Google Apps domain defined, all Google accounts allowed.")

google = oauth.remote_app('google',
                          base_url='https://www.google.com/accounts/',
                          authorize_url='https://accounts.google.com/o/oauth2/auth',
                          request_token_url=None,
                          request_token_params=request_token_params,
                          access_token_url='https://accounts.google.com/o/oauth2/token',
                          access_token_method='POST',
                          access_token_params={'grant_type': 'authorization_code'},
                          consumer_key=settings.GOOGLE_CLIENT_ID,
                          consumer_secret=settings.GOOGLE_CLIENT_SECRET)


blueprint = Blueprint('google_oauth', __name__)


def get_user_profile(access_token):
    headers = {'Authorization': 'OAuth '+access_token}
    response = requests.get('https://www.googleapis.com/oauth2/v1/userinfo', headers=headers)

    if response.status_code == 401:
        logger.warning("Failed getting user profile (response code 401).")
        return None

    return response.json()


def create_and_login_user(name, email):
    try:
        user_object = models.User.get(models.User.email == email)
        if user_object.name != name:
            logger.debug("Updating user name (%r -> %r)", user_object.name, name)
            user_object.name = name
            user_object.save()
    except models.User.DoesNotExist:
        logger.debug("Creating user object (%r)", name)
        user_object = models.User.create(name=name, email=email, groups=models.User.DEFAULT_GROUPS)

    login_user(user_object, remember=True)


@blueprint.route('/oauth/google', endpoint="authorize")
def login():
    # TODO, suport next
    callback=url_for('.callback', _external=True)
    logger.debug("Callback url: %s", callback)
    return google.authorize(callback=callback)


@blueprint.route('/oauth/google_callback', endpoint="callback")
@google.authorized_handler
def authorized(resp):
    access_token = resp['access_token']

    if access_token is None:
        logger.warning("Access token missing in call back request.")
        return redirect(url_for('login'))

    profile = get_user_profile(access_token)
    if profile is None:
        return redirect(url_for('login'))

    create_and_login_user(profile['name'], profile['email'])

    return redirect(url_for('index'))