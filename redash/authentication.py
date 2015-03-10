import functools
import hashlib
import hmac
import time
import logging

from flask import request, make_response, redirect, url_for
from flask.ext.login import LoginManager, login_user, current_user, logout_user

from redash import models, settings, google_oauth

login_manager = LoginManager()
logger = logging.getLogger('authentication')


def sign(key, path, expires):
    if not key:
        return None

    h = hmac.new(str(key), msg=path, digestmod=hashlib.sha1)
    h.update(str(expires))

    return h.hexdigest()


class Authentication(object):
    def verify_authentication(self):
        return False

    def required(self, fn):
        @functools.wraps(fn)
        def decorated(*args, **kwargs):
            if current_user.is_authenticated() or self.verify_authentication():
                return fn(*args, **kwargs)

            return make_response(redirect(url_for("login", next=request.url)))

        return decorated


class ApiKeyAuthentication(Authentication):
    def verify_authentication(self):
        api_key = request.args.get('api_key')
        query_id = request.view_args.get('query_id', None)

        if query_id and api_key:
            query = models.Query.get(models.Query.id == query_id)

            if query.api_key and api_key == query.api_key:
                login_user(models.ApiUser(query.api_key), remember=False)
                return True

        return False


class HMACAuthentication(Authentication):
    def verify_authentication(self):
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


@login_manager.user_loader
def load_user(user_id):
    # If the user was previously logged in as api user, the user_id will be the api key and will raise an exception as
    # it can't be casted to int.
    if isinstance(user_id, basestring) and not user_id.isdigit():
        return None

    return models.User.select().where(models.User.id == user_id).first()


def setup_authentication(app):
    login_manager.init_app(app)
    login_manager.anonymous_user = models.AnonymousUser
    app.secret_key = settings.COOKIE_SECRET
    app.register_blueprint(google_oauth.blueprint)

    if settings.AUTH_TYPE == 'hmac':
        auth = HMACAuthentication()
    elif settings.AUTH_TYPE == 'api_key':
        auth = ApiKeyAuthentication()
    else:
        logger.warning("Unknown authentication type ({}). Using default (HMAC).".format(settings.AUTH_TYPE))
        auth = HMACAuthentication()

    return auth

