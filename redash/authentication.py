import functools
from flask import request, make_response
from flask.ext.googleauth import GoogleFederated
from werkzeug.contrib.fixers import ProxyFix
import werkzeug.wrappers
from redash import data, settings


class HMACAuthentication(object):
    def __init__(self, auth):
        self.auth = auth

        #user = super(CsvQueryResultsHandler, self).get_current_user()
        #if not user:
        #    api_key = self.get_argument("api_key", None)
        #    query = data.models.Query.objects.get(pk=self.path_args[0])
        #
        #    if query.api_key and query.api_key == api_key:
        #        user = "API-Key=%s" % api_key
        #
        #return user

    def required(self, fn):
        wrapped_fn = self.auth.required(fn)

        @functools.wraps(fn)
        def decorated(*args, **kwargs):
            api_key = request.args.get('api_key')
            query_id = request.view_args.get('query_id', None)

            if api_key and query_id:
                query = data.models.Query.objects.get(pk=query_id)
                if query.api_key and query.api_key == api_key:
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
    openid_auth.force_auth_on_every_request = True

    return HMACAuthentication(openid_auth)
