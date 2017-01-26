import logging
import urlparse
import redis
from flask import Flask
from flask_sslify import SSLify
from werkzeug.contrib.fixers import ProxyFix
from werkzeug.routing import BaseConverter, ValidationError
from statsd import StatsClient
from flask_mail import Mail
from flask_limiter import Limiter
from flask_limiter.util import get_ipaddr
from flask_migrate import Migrate

from redash import settings
from redash.query_runner import import_query_runners
from redash.destinations import import_destinations


__version__ = '1.0.0'


def setup_logging():
    handler = logging.StreamHandler()
    formatter = logging.Formatter('[%(asctime)s][PID:%(process)d][%(levelname)s][%(name)s] %(message)s')
    handler.setFormatter(formatter)
    logging.getLogger().addHandler(handler)
    logging.getLogger().setLevel(settings.LOG_LEVEL)

    # Make noisy libraries less noisy
    if settings.LOG_LEVEL != "DEBUG":
        logging.getLogger("passlib").setLevel("ERROR")
        logging.getLogger("requests.packages.urllib3").setLevel("ERROR")
        logging.getLogger("snowflake.connector").setLevel("ERROR")


def create_redis_connection():
    redis_url = urlparse.urlparse(settings.REDIS_URL)

    if redis_url.scheme == 'redis+socket':
        qs = urlparse.parse_qs(redis_url.query)
        if 'virtual_host' in qs:
            db = qs['virtual_host'][0]
        else:
            db = 0

        r = redis.StrictRedis(unix_socket_path=redis_url.path, db=db)
    else:
        if redis_url.path:
            redis_db = redis_url.path[1]
        else:
            redis_db = 0

        r = redis.StrictRedis(host=redis_url.hostname, port=redis_url.port, db=redis_db, password=redis_url.password)

    return r


setup_logging()
redis_connection = create_redis_connection()
mail = Mail()
migrate = Migrate()
mail.init_mail(settings.all_settings())
statsd_client = StatsClient(host=settings.STATSD_HOST, port=settings.STATSD_PORT, prefix=settings.STATSD_PREFIX)
limiter = Limiter(key_func=get_ipaddr, storage_uri=settings.REDIS_URL)

import_query_runners(settings.QUERY_RUNNERS)
import_destinations(settings.DESTINATIONS)

from redash.version_check import reset_new_version_status
reset_new_version_status()


class SlugConverter(BaseConverter):
    def to_python(self, value):
        # This is an ugly workaround for when we enable multi-org and some files are being called by the index rule:
        if value in ('google_login.png', 'favicon.ico', 'robots.txt', 'views'):
            raise ValidationError()

        return value

    def to_url(self, value):
        return value


def create_app(load_admin=True):
    from redash import handlers
    from redash.admin import init_admin
    from redash.models import db
    from redash.authentication import setup_authentication
    from redash.metrics.request import provision_app

    app = Flask(__name__,
                template_folder=settings.STATIC_ASSETS_PATHS[-1],
                static_folder=settings.STATIC_ASSETS_PATHS[-1],
                static_path='/static')

    # Make sure we get the right referral address even behind proxies like nginx.
    app.wsgi_app = ProxyFix(app.wsgi_app, settings.PROXIES_COUNT)
    app.url_map.converters['org_slug'] = SlugConverter

    if settings.ENFORCE_HTTPS:
        SSLify(app, skips=['ping'])

    if settings.SENTRY_DSN:
        from raven.contrib.flask import Sentry
        from raven.handlers.logging import SentryHandler
        sentry = Sentry(app, dsn=settings.SENTRY_DSN)
        sentry.client.release = __version__

        sentry_handler = SentryHandler(settings.SENTRY_DSN)
        sentry_handler.setLevel(logging.ERROR)
        logging.getLogger().addHandler(sentry_handler)

    # configure our database
    app.config['SQLALCHEMY_DATABASE_URI'] = settings.SQLALCHEMY_DATABASE_URI
    app.config.update(settings.all_settings())

    provision_app(app)
    db.init_app(app)
    migrate.init_app(app, db)
    if load_admin:
        init_admin(app)
    mail.init_app(app)
    setup_authentication(app)
    limiter.init_app(app)
    handlers.init_app(app)

    return app
