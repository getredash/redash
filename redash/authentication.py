import functools
import hashlib
import hmac
import time
import logging

from flask import request, make_response, redirect, url_for
from flask.ext.login import LoginManager, login_user, current_user

from redash import models, settings, google_oauth

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


@login_manager.user_loader
def load_user(user_id):
    return models.User.select().where(models.User.id == user_id).first()


def setup_authentication(app):
    login_manager.init_app(app)
    login_manager.anonymous_user = models.AnonymousUser
    app.secret_key = settings.COOKIE_SECRET
    app.register_blueprint(google_oauth.blueprint)

    return HMACAuthentication()
