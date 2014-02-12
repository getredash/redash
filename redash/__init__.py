import json
import urlparse
from flask import Flask, make_response
from flask.ext.restful import Api
from flask_peewee.db import Database

import redis
from redash import settings, utils

__version__ = '0.3.2'

app = Flask(__name__,
            template_folder=settings.STATIC_ASSETS_PATH,
            static_folder=settings.STATIC_ASSETS_PATH,
            static_path='/static')


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
redis_connection = redis.StrictRedis(host=redis_url.hostname, port=redis_url.port, db=0, password=redis_url.password)

from redash import data
data_manager = data.Manager(redis_connection, db)

from redash import controllers