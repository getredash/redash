from __future__ import absolute_import

from redash import redis_connection
from redash.schedule import rq_scheduler, schedule_periodic_jobs

from click import argument
from flask.cli import AppGroup
from rq import Connection, Worker

manager = AppGroup(help="RQ management commands.")


@manager.command()
def scheduler():
    schedule_periodic_jobs()
    rq_scheduler.run()


@manager.command()
@argument('queues', nargs=-1)
def worker(queues='default'):
    with Connection(redis_connection):
        w = Worker(queues)
        w.work()
