import json
from flask import Flask, make_response
from werkzeug.wrappers import Response
from flask_restful import Api
from flask_sslify import SSLify
from werkzeug.contrib.fixers import ProxyFix

from redash import settings, utils, mail, __version__
from redash.models import db
from redash.metrics.request import provision_app
from redash.admin import init_admin
from werkzeug.routing import BaseConverter, ValidationError


class SlugConverter(BaseConverter):
    def to_python(self, value):
        # This is an ugly workaround for when we enable multi-org and some files are being called by the index rule:
        if value in ('google_login.png', 'favicon.ico', 'robots.txt', 'views'):
            raise ValidationError()

        return value

    def to_url(self, value):
        return value


app = Flask(__name__,
            template_folder=settings.STATIC_ASSETS_PATH,
            static_folder=settings.STATIC_ASSETS_PATH,
            static_path='/static')

# Make sure we get the right referral address even behind proxies like nginx.
app.wsgi_app = ProxyFix(app.wsgi_app, settings.PROXIES_COUNT)
app.url_map.converters['org_slug'] = SlugConverter
provision_app(app)


# TODO: remove duplication
def org_scoped_rule(rule):
    if settings.MULTI_ORG:
        return "/<org_slug>{}".format(rule)

    return rule


class ApiExt(Api):
    def add_org_resource(self, resource, *urls, **kwargs):
        urls = [org_scoped_rule(url) for url in urls]
        return self.add_resource(resource, *urls, **kwargs)

api = ApiExt(app)
init_admin(app)


if settings.ENFORCE_HTTPS:
    SSLify(app, skips=['ping'])


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
