import logging
import urlparse
import redis
import hipchat
from statsd import StatsClient
from flask_mail import Mail

from redash import settings
from redash.query_runner import import_query_runners

__version__ = '0.8.2'


def setup_logging():
    handler = logging.StreamHandler()
    formatter = logging.Formatter('[%(asctime)s][PID:%(process)d][%(levelname)s][%(name)s] %(message)s')
    handler.setFormatter(formatter)
    logging.getLogger().addHandler(handler)
    logging.getLogger().setLevel(settings.LOG_LEVEL)
    logging.getLogger("passlib").setLevel("ERROR")


def create_redis_connection():
    redis_url = urlparse.urlparse(settings.REDIS_URL)
    if redis_url.path:
        redis_db = redis_url.path[1]
    else:
        redis_db = 0

    r = redis.StrictRedis(host=redis_url.hostname, port=redis_url.port, db=redis_db, password=redis_url.password)

    return r


setup_logging()
redis_connection = create_redis_connection()
mail = Mail()
mail.init_mail(settings.all_settings())
statsd_client = StatsClient(host=settings.STATSD_HOST, port=settings.STATSD_PORT, prefix=settings.STATSD_PREFIX)
hipchat_client = hipchat.HipChat(token=settings.HIPCHAT_API_TOKEN)

import_query_runners(settings.QUERY_RUNNERS)

from redash.version_check import reset_new_version_status
reset_new_version_status()
