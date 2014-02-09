import functools
import hashlib
import hmac
from flask import request, make_response
from flask.ext.googleauth import GoogleFederated
import time
from werkzeug.contrib.fixers import ProxyFix
import werkzeug.wrappers
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

    def required(self, fn):
        wrapped_fn = self.auth.required(fn)

        @functools.wraps(fn)
        def decorated(*args, **kwargs):
            signature = request.args.get('signature')
            expires = float(request.args.get('expires') or 0)
            query_id = request.view_args.get('query_id', None)

            # TODO: 3600 should be a setting
            if signature and query_id and time.time() < expires <= time.time() + 3600:
                query = models.Query.get(models.Query.id == query_id)
                calculated_signature = sign(query.api_key, request.path, expires)

                if query.api_key and signature == calculated_signature:
                    return fn(*args, **kwargs)

            # Work around for flask-restful testing only for flask.wrappers.Resource instead of
            # werkzeug.wrappers.Response
            resp = wrapped_fn(*args, **kwargs)
            if isinstance(resp, werkzeug.wrappers.Response):
                resp = make_response(resp)

            return resp

        return decorated


def setup_authentication(app):
    openid_auth = GoogleFederated(settings.GOOGLE_APPS_DOMAIN, app)
    app.wsgi_app = ProxyFix(app.wsgi_app)
    app.secret_key = settings.COOKIE_SECRET

    return HMACAuthentication(openid_auth)
