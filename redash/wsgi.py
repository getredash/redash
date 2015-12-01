import json
from flask import Flask, make_response
from werkzeug.wrappers import Response
from werkzeug.contrib.fixers import ProxyFix
from flask.ext.restful import Api

from redash import settings, utils, mail, __version__
from redash.models import db
from redash.metrics.request import provision_app
from redash.admin import init_admin


app = Flask(__name__,
            template_folder=settings.STATIC_ASSETS_PATH,
            static_folder=settings.STATIC_ASSETS_PATH,
            static_path='/static')

# Make sure we get the right referral address even behind proxies like nginx.
app.wsgi_app = ProxyFix(app.wsgi_app)
provision_app(app)

api = Api(app)
init_admin(app)


if settings.SENTRY_DSN:
    from raven.contrib.flask import Sentry
    sentry = Sentry(app, dsn=settings.SENTRY_DSN)
    sentry.client.release = __version__

# configure our database
settings.DATABASE_CONFIG.update({'threadlocals': True})
app.config['DATABASE'] = settings.DATABASE_CONFIG
app.config.update(settings.all_settings())
db.init_app(app)
mail.init_app(app)

from redash.authentication import setup_authentication
setup_authentication(app)


@api.representation('application/json')
def json_representation(data, code, headers=None):
    # Flask-Restful checks only for flask.Response but flask-login uses werkzeug.wrappers.Response
    if isinstance(data, Response):
        return data
    resp = make_response(json.dumps(data, cls=utils.JSONEncoder), code)
    resp.headers.extend(headers or {})
    return resp

from redash import handlers
