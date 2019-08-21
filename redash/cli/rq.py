from __future__ import absolute_import

from redash import redis_connection, settings

from click import argument
from flask.cli import AppGroup
from rq import Connection, Worker

manager = AppGroup(help="RQ management commands.")


@manager.command()
@argument('queues')
def worker(queues='default'):
    with Connection(redis_connection):
        w = Worker(queues)
        w.work()
