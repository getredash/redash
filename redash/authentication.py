import functools
import hashlib
import hmac
import time
import logging

from flask import request, make_response, redirect, url_for
from flask.ext.login import LoginManager, login_user, current_user
from flask.ext.googleauth import GoogleAuth, login
from werkzeug.contrib.fixers import ProxyFix

from redash import models, settings

login_manager = LoginManager()
logger = logging.getLogger('authentication')


def sign(key, path, expires):
    if not key:
        return None

    h = hmac.new(str(key), msg=path, digestmod=hashlib.sha1)
    h.update(str(expires))

    return h.hexdigest()


class HMACAuthentication(object):
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
                login_user(models.ApiUser(query.api_key), remember=False)
                return True

        return False

    def required(self, fn):
        @functools.wraps(fn)
        def decorated(*args, **kwargs):
            if current_user.is_authenticated():
                return fn(*args, **kwargs)

            if self.api_key_authentication():
                return fn(*args, **kwargs)

            return make_response(redirect(url_for("login", next=request.url)))

        return decorated


def validate_email(email):
    if not settings.GOOGLE_APPS_DOMAIN:
        return True

    return email in settings.ALLOWED_EXTERNAL_USERS or email.endswith("@%s" % settings.GOOGLE_APPS_DOMAIN)


def create_and_login_user(app, user):
    if not validate_email(user.email):
        return

    try:
        user_object = models.User.get(models.User.email == user.email)
        if user_object.name != user.name:
            logger.debug("Updating user name (%r -> %r)", user_object.name, user.name)
            user_object.name = user.name
            user_object.save()
    except models.User.DoesNotExist:
        logger.debug("Creating user object (%r)", user.name)
        user_object = models.User.create(name=user.name, email=user.email, groups = models.User.DEFAULT_GROUPS)

    login_user(user_object, remember=True)

login.connect(create_and_login_user)


@login_manager.user_loader
def load_user(user_id):
    return models.User.select().where(models.User.id == user_id).first()


def setup_authentication(app):
    if settings.GOOGLE_OPENID_ENABLED:
        openid_auth = GoogleAuth(app, url_prefix="/google_auth")
        # If we don't have a list of external users, we can use Google's federated login, which limits
        # the domain with which you can sign in.
        if not settings.ALLOWED_EXTERNAL_USERS and settings.GOOGLE_APPS_DOMAIN:
            openid_auth._OPENID_ENDPOINT = "https://www.google.com/a/%s/o8/ud?be=o8" % settings.GOOGLE_APPS_DOMAIN

    login_manager.init_app(app)
    login_manager.anonymous_user = models.AnonymousUser
    app.wsgi_app = ProxyFix(app.wsgi_app)
    app.secret_key = settings.COOKIE_SECRET

    return HMACAuthentication()
