import functools
import hashlib
import hmac
from flask import current_app, request, make_response, g, redirect, url_for
from flask.ext.googleauth import GoogleAuth
import time
from werkzeug.contrib.fixers import ProxyFix
from redash import models, settings


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
        return g.user is not None

    @staticmethod
    def valid_user():
        email = g.user['email']
        if not settings.GOOGLE_APPS_DOMAIN:
            return True

        return email in settings.ALLOWED_EXTERNAL_USERS or email.endswith("@%s" % settings.GOOGLE_APPS_DOMAIN)

    def required(self, fn):
        @functools.wraps(fn)
        def decorated(*args, **kwargs):
            if self.is_user_logged_in() and self.valid_user():
                return fn(*args, **kwargs)

            if self.api_key_authentication():
                return fn(*args, **kwargs)

            blueprint = current_app.extensions['googleauth'].blueprint
            # The make_response call is a work around for flask-restful testing only for
            # flask.wrappers.Resource instead of werkzeug.wrappers.Response
            return make_response(redirect(url_for("%s.login" % blueprint.name, next=request.url)))

        return decorated


def setup_authentication(app):
    openid_auth = GoogleAuth(app)
    app.wsgi_app = ProxyFix(app.wsgi_app)
    app.secret_key = settings.COOKIE_SECRET

    return HMACAuthentication(openid_auth)
