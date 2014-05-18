import logging
import urlparse
import redis
from statsd import StatsClient

from redash import settings, events

__version__ = '0.4.0'


def setup_logging():
    handler = logging.StreamHandler()
    formatter = logging.Formatter('[%(asctime)s][PID:%(process)d][%(levelname)s][%(name)s] %(message)s')
    handler.setFormatter(formatter)
    logging.getLogger().addHandler(handler)
    logging.getLogger().setLevel(settings.LOG_LEVEL)

    events.setup_logging(settings.EVENTS_LOG_PATH, settings.EVENTS_CONSOLE_OUTPUT)


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
statsd_client = StatsClient(host=settings.STATSD_HOST, port=settings.STATSD_PORT, prefix=settings.STATSD_PREFIX)