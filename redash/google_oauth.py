import logging
from flask.ext.login import login_user
import requests
from flask import redirect, url_for, Blueprint, flash, request
from flask_oauthlib.client import OAuth
from redash import models, settings

logger = logging.getLogger('google_oauth')

if not settings.GOOGLE_APPS_DOMAIN:
    logger.warning("No Google Apps domain defined, all Google accounts allowed.")

oauth = OAuth()
blueprint = Blueprint('google_oauth', __name__)


def google_remote_app():
    if 'google' not in oauth.remote_apps:
        oauth.remote_app('google',
                         base_url='https://www.google.com/accounts/',
                         authorize_url='https://accounts.google.com/o/oauth2/auth',
                         request_token_url=None,
                         request_token_params={
                             'scope': 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
                         },
                         access_token_url='https://accounts.google.com/o/oauth2/token',
                         access_token_method='POST',
                         consumer_key=settings.GOOGLE_CLIENT_ID,
                         consumer_secret=settings.GOOGLE_CLIENT_SECRET)

    return oauth.google


def get_user_profile(access_token):
    headers = {'Authorization': 'OAuth {}'.format(access_token)}
    response = requests.get('https://www.googleapis.com/oauth2/v1/userinfo', headers=headers)

    if response.status_code == 401:
        logger.warning("Failed getting user profile (response code 401).")
        return None

    return response.json()


def verify_profile(profile):
    if not settings.GOOGLE_APPS_DOMAIN:
        return True

    domain = profile['email'].split('@')[-1]
    return domain in settings.GOOGLE_APPS_DOMAIN


def create_and_login_user(name, email):
    try:
        user_object = models.User.get_by_email(email)
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
    next = request.args.get('next', '/')
    callback = url_for('.callback', _external=True)
    logger.debug("Callback url: %s", callback)
    logger.debug("Next is: %s", next)
    return google_remote_app().authorize(callback=callback, state=next)


@blueprint.route('/oauth/google_callback', endpoint="callback")
def authorized():
    resp = google_remote_app().authorized_response()
    access_token = resp['access_token']

    if access_token is None:
        logger.warning("Access token missing in call back request.")
        flash("Validation error. Please retry.")
        return redirect(url_for('login'))

    profile = get_user_profile(access_token)
    if profile is None:
        flash("Validation error. Please retry.")
        return redirect(url_for('login'))

    if not verify_profile(profile):
        logger.warning("User tried to login with unauthorized domain name: %s", profile['email'])
        flash("Your Google Apps domain name isn't allowed.")
        return redirect(url_for('login'))

    create_and_login_user(profile['name'], profile['email'])

    next = request.args.get('state', '/')

    return redirect(next)
