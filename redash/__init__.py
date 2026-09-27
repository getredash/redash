import logging
import os
import sys

import redis
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_mail import Mail
from flask_migrate import Migrate
from statsd import StatsClient

from redash import settings
from redash.app import create_app  # noqa
from redash.destinations import import_destinations
from redash.query_runner import import_query_runners

__version__ = "26.09.0-dev"


if os.environ.get("REMOTE_DEBUG"):
    import debugpy

    debugpy.listen(("0.0.0.0", 5678))
    debugpy.wait_for_client()


def setup_logging():
    handler = logging.StreamHandler(sys.stdout if settings.LOG_STDOUT else sys.stderr)
    formatter = logging.Formatter(settings.LOG_FORMAT)
    handler.setFormatter(formatter)
    logging.getLogger().addHandler(handler)
    logging.getLogger().setLevel(settings.LOG_LEVEL)

    # Make noisy libraries less noisy
    if settings.LOG_LEVEL != "DEBUG":
        for name in [
            "passlib",
            "requests.packages.urllib3",
            "snowflake.connector",
            "apiclient",
        ]:
            logging.getLogger(name).setLevel("ERROR")


def configure_sqlparse():
    """Apply Redash's sqlparse grouping limits.

    sqlparse caps how much work grouping will do on a single statement and
    raises SQLParseError past the cap. Operators who need the cap raised (or
    removed, with 0) can do so without patching sqlparse itself.
    """
    from sqlparse.engine import grouping

    grouping.MAX_GROUPING_TOKENS = settings.SQLPARSE_MAX_GROUPING_TOKENS or None
    grouping.MAX_GROUPING_DEPTH = settings.SQLPARSE_MAX_GROUPING_DEPTH or None


setup_logging()
configure_sqlparse()

redis_connection = redis.from_url(settings.REDIS_URL)
rq_redis_connection = redis.from_url(settings.RQ_REDIS_URL)
mail = Mail()
migrate = Migrate(compare_type=True)
statsd_client = StatsClient(host=settings.STATSD_HOST, port=settings.STATSD_PORT, prefix=settings.STATSD_PREFIX)
limiter = Limiter(key_func=get_remote_address, storage_uri=settings.LIMITER_STORAGE)

import_query_runners(settings.QUERY_RUNNERS)
import_destinations(settings.DESTINATIONS)
