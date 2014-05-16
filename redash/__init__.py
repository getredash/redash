import json
import urlparse
import logging
from flask import Flask, make_response
from flask.ext.restful import Api
from flask_peewee.db import Database
import redis
from statsd import StatsClient
from celery import Celery

import events
from redash import settings, utils

__version__ = '0.4.0'


def setup_logging():
    handler = logging.StreamHandler()
    formatter = logging.Formatter('[%(asctime)s][PID:%(process)d][%(levelname)s][%(name)s] %(message)s')
    handler.setFormatter(formatter)
    logging.getLogger().addHandler(handler)
    logging.getLogger().setLevel(settings.LOG_LEVEL)

    events.setup_logging(settings.EVENTS_LOG_PATH, settings.EVENTS_CONSOLE_OUTPUT)

setup_logging()

app = Flask(__name__,
            template_folder=settings.STATIC_ASSETS_PATH,
            static_folder=settings.STATIC_ASSETS_PATH,
            static_path='/static')

celery = Celery('redash',
                broker=settings.CELERY_BROKER,
                include='redash.tasks')
celery.conf.update(CELERY_RESULT_BACKEND=settings.CELERY_BACKEND)

api = Api(app)

# configure our database
settings.DATABASE_CONFIG.update({'threadlocals': True})
app.config['DATABASE'] = settings.DATABASE_CONFIG
db = Database(app)

from redash.authentication import setup_authentication
auth = setup_authentication(app)

@api.representation('application/json')
def json_representation(data, code, headers=None):
    resp = make_response(json.dumps(data, cls=utils.JSONEncoder), code)
    resp.headers.extend(headers or {})
    return resp


redis_url = urlparse.urlparse(settings.REDIS_URL)
if redis_url.path:
    redis_db = redis_url.path[1]
else:
    redis_db = 0

redis_connection = redis.StrictRedis(host=redis_url.hostname, port=redis_url.port, db=redis_db, password=redis_url.password)
statsd_client = StatsClient(host=settings.STATSD_HOST, port=settings.STATSD_PORT, prefix=settings.STATSD_PREFIX)

from redash import data
data_manager = data.Manager(redis_connection, statsd_client)

from redash import controllers
