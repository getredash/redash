import logging
import requests
from flask import redirect, url_for, Blueprint, flash, request, session
from flask_login import login_user
from flask_oauthlib.client import OAuth
from sqlalchemy.orm.exc import NoResultFound

from redash import models, settings
from redash.authentication.org_resolving import current_org

logger = logging.getLogger('google_oauth')

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


def verify_profile(org, profile):
    if org.is_public:
        return True

    email = profile['email']
    domain = email.split('@')[-1]

    if domain in org.google_apps_domains:
        return True

    if org.has_user(email) == 1:
        return True

    return False


def create_and_login_user(org, name, email):
    try:
        user_object = models.User.get_by_email_and_org(email, org)
        if user_object.name != name:
            logger.debug("Updating user name (%r -> %r)", user_object.name, name)
            user_object.name = name
            models.db.session.commit()
    except NoResultFound:
        logger.debug("Creating user object (%r)", name)
        user_object = models.User(org=org, name=name, email=email, group_ids=[org.default_group.id])
        models.db.session.add(user_object)
        models.db.session.commit()

    login_user(user_object, remember=True)

    return user_object


@blueprint.route('/<org_slug>/oauth/google', endpoint="authorize_org")
def org_login(org_slug):
    session['org_slug'] = current_org.slug
    return redirect(url_for(".authorize", next=request.args.get('next', None)))


@blueprint.route('/oauth/google', endpoint="authorize")
def login():
    callback = url_for('.callback', _external=True)
    next = request.args.get('next', url_for("redash.index", org_slug=session.get('org_slug')))
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
        return redirect(url_for('redash.login'))

    profile = get_user_profile(access_token)
    if profile is None:
        flash("Validation error. Please retry.")
        return redirect(url_for('redash.login'))

    if 'org_slug' in session:
        org = models.Organization.get_by_slug(session.pop('org_slug'))
    else:
        org = current_org

    if not verify_profile(org, profile):
        logger.warning("User tried to login with unauthorized domain name: %s (org: %s)", profile['email'], org)
        flash("Your Google Apps account ({}) isn't allowed.".format(profile['email']))
        return redirect(url_for('redash.login', org_slug=org.slug))

    create_and_login_user(org, profile['name'], profile['email'])

    next = request.args.get('state') or url_for("redash.index", org_slug=org.slug)

    return redirect(next)
