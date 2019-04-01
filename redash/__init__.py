import sys
import logging
import urlparse
import urllib

import redis
from flask import Flask, current_app
from werkzeug.contrib.fixers import ProxyFix
from werkzeug.routing import BaseConverter
from statsd import StatsClient
from flask_mail import Mail
from flask_limiter import Limiter
from flask_limiter.util import get_ipaddr
from flask_migrate import Migrate

from redash import settings
from redash.query_runner import import_query_runners
from redash.destinations import import_destinations


__version__ = '7.0.0'


import os
if os.environ.get("REMOTE_DEBUG"):
    import ptvsd
    ptvsd.enable_attach(address=('0.0.0.0', 5678))


def setup_logging():
    handler = logging.StreamHandler(sys.stdout if settings.LOG_STDOUT else sys.stderr)
    formatter = logging.Formatter(settings.LOG_FORMAT)
    handler.setFormatter(formatter)
    logging.getLogger().addHandler(handler)
    logging.getLogger().setLevel(settings.LOG_LEVEL)

    # Make noisy libraries less noisy
    if settings.LOG_LEVEL != "DEBUG":
        logging.getLogger("passlib").setLevel("ERROR")
        logging.getLogger("requests.packages.urllib3").setLevel("ERROR")
        logging.getLogger("snowflake.connector").setLevel("ERROR")
        logging.getLogger('apiclient').setLevel("ERROR")


def create_redis_connection():
    logging.debug("Creating Redis connection (%s)", settings.REDIS_URL)
    redis_url = urlparse.urlparse(settings.REDIS_URL)

    if redis_url.scheme == 'redis+socket':
        qs = urlparse.parse_qs(redis_url.query)
        if 'virtual_host' in qs:
            db = qs['virtual_host'][0]
        else:
            db = 0

        client = redis.StrictRedis(unix_socket_path=redis_url.path, db=db)
    else:
        if redis_url.path:
            redis_db = redis_url.path[1]
        else:
            redis_db = 0
        # Redis passwords might be quoted with special characters
        redis_password = redis_url.password and urllib.unquote(redis_url.password)
        client = redis.StrictRedis(host=redis_url.hostname, port=redis_url.port, db=redis_db, password=redis_password)

    return client


setup_logging()
redis_connection = create_redis_connection()

mail = Mail()
migrate = Migrate()
mail.init_mail(settings.all_settings())
statsd_client = StatsClient(host=settings.STATSD_HOST, port=settings.STATSD_PORT, prefix=settings.STATSD_PREFIX)
limiter = Limiter(key_func=get_ipaddr, storage_uri=settings.LIMITER_STORAGE)

import_query_runners(settings.QUERY_RUNNERS)
import_destinations(settings.DESTINATIONS)

from redash.version_check import reset_new_version_status
reset_new_version_status()


class SlugConverter(BaseConverter):
    def to_python(self, value):
        # This is ay workaround for when we enable multi-org and some files are being called by the index rule:
        # for path in settings.STATIC_ASSETS_PATHS:
        #     full_path = safe_join(path, value)
        #     if os.path.isfile(full_path):
        #         raise ValidationError()

        return value

    def to_url(self, value):
        return value


def create_app():
    from redash import authentication, extensions, handlers, security
    from redash.handlers.webpack import configure_webpack
    from redash.handlers import chrome_logger
    from redash.models import db, users
    from redash.metrics import request as request_metrics
    from redash.utils import sentry

    sentry.init()

    app = Flask(__name__,
                template_folder=settings.STATIC_ASSETS_PATH,
                static_folder=settings.STATIC_ASSETS_PATH,
                static_url_path='/static')

    # Make sure we get the right referral address even behind proxies like nginx.
    app.wsgi_app = ProxyFix(app.wsgi_app, settings.PROXIES_COUNT)
    app.url_map.converters['org_slug'] = SlugConverter

    # configure our database
    app.config['SQLALCHEMY_DATABASE_URI'] = settings.SQLALCHEMY_DATABASE_URI
    app.config.update(settings.all_settings())

    security.init_app(app)
    request_metrics.init_app(app)
    db.init_app(app)
    migrate.init_app(app, db)
    mail.init_app(app)
    authentication.init_app(app)
    limiter.init_app(app)
    handlers.init_app(app)
    configure_webpack(app)
    extensions.init_app(app)
    chrome_logger.init_app(app)
    users.init_app(app)

    return app
