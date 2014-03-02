import functools
import hashlib
import hmac
from flask import current_app, request, make_response, g, redirect, url_for
from flask.ext.googleauth import GoogleAuth, login
from flask.ext.login import LoginManager, login_user, current_user
import time
from werkzeug.contrib.fixers import ProxyFix
from redash import models, settings

login_manager = LoginManager()


def sign(key, path, expires):
    if not key:
        return None

    h = hmac.new(str(key), msg=path, digestmod=hashlib.sha1)
    h.update(str(expires))

    return h.hexdigest()


class HMACAuthentication(object):
    def __init__(self, auth):
        self.auth = auth

    @staticmethod
    def api_key_authentication():
        signature = request.args.get('signature')
        expires = float(request.args.get('expires') or 0)
        query_id = request.view_args.get('query_id', None)

        # TODO: 3600 should be a setting
        if signature and query_id and time.time() < expires <= time.time() + 3600:
            query = models.Query.get(models.Query.id == query_id)
            calculated_signature = sign(query.api_key, request.path, expires)

            if query.api_key and signature == calculated_signature:
                return True

        return False

    @staticmethod
    def is_user_logged_in():
        return current_user.is_authenticated()

    def required(self, fn):
        @functools.wraps(fn)
        def decorated(*args, **kwargs):
            if self.is_user_logged_in():
                return fn(*args, **kwargs)

            if self.api_key_authentication():
                return fn(*args, **kwargs)

            blueprint = current_app.extensions['googleauth'].blueprint
            # The make_response call is a work around for flask-restful testing only for
            # flask.wrappers.Resource instead of werkzeug.wrappers.Response
            return make_response(redirect(url_for("%s.login" % blueprint.name, next=request.url)))

        return decorated


def validate_email(email):
    if not settings.GOOGLE_APPS_DOMAIN:
        return True

    return email in settings.ALLOWED_EXTERNAL_USERS or email.endswith("@%s" % settings.GOOGLE_APPS_DOMAIN)


def create_and_login_user(_, openid_user):
    if not validate_email(openid_user.email):
        return

    try:
        user = models.User.get(models.User.email == openid_user.email)
        if user.name != openid_user.name:
            current_app.logger.debug("Updating user name (%r -> %r)", user.name, openid_user.name)
            user.name = openid_user.name
            user.save()
    except models.User.DoesNotExist:
        current_app.logger.debug("Creating user object (%r)", user.name)
        user = models.User.create(name=openid_user.name, email=openid_user.email)

    login_user(user, remember=True)

login.connect(create_and_login_user)


@login_manager.user_loader
def load_user(user_id):
    return models.User.select().where(models.User.id == user_id).first()


def setup_authentication(app):
    openid_auth = GoogleAuth(app)
    # If we don't have a list of external users, we can use Google's federated login, which limits
    # the domain with which you can sign in.
    if not settings.ALLOWED_EXTERNAL_USERS and settings.GOOGLE_APPS_DOMAIN:
        openid_auth._OPENID_ENDPOINT = "https://www.google.com/a/%s/o8/ud?be=o8" % settings.GOOGLE_APPS_DOMAIN

    login_manager.init_app(app)
    app.wsgi_app = ProxyFix(app.wsgi_app)
    app.secret_key = settings.COOKIE_SECRET

    return HMACAuthentication(openid_auth)
