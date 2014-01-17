import json
import urlparse
from flask import Flask, make_response
from flask.ext.googleauth import GoogleFederated
from flask.ext.restful import Api
from werkzeug.contrib.fixers import ProxyFix
import redis
from redash import settings
from redash.data import utils


def setup_authentication(app):
    auth = GoogleFederated(settings.GOOGLE_APPS_DOMAIN, app)
    app.wsgi_app = ProxyFix(app.wsgi_app)
    app.secret_key = settings.COOKIE_SECRET
    auth.force_auth_on_every_request = True

    return auth


app = Flask(__name__,
            template_folder=settings.STATIC_ASSETS_PATH,
            static_folder=settings.STATIC_ASSETS_PATH,
            static_path='/static')

auth = setup_authentication(app)
api = Api(app)


@api.representation('application/json')
def json_representation(data, code, headers=None):
    resp = make_response(json.dumps(data, cls=utils.JSONEncoder), code)
    resp.headers.extend(headers or {})
    return resp


redis_url = urlparse.urlparse(settings.REDIS_URL)
redis_connection = redis.StrictRedis(host=redis_url.hostname, port=redis_url.port, db=0, password=redis_url.password)
data_manager = data.Manager(redis_connection, settings.INTERNAL_DB_CONNECTION_STRING, settings.MAX_CONNECTIONS)

from redash import controllers