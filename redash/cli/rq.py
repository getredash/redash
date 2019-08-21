from __future__ import absolute_import

from redash import redis_connection, settings

from click import argument
from flask.cli import AppGroup
from rq import Connection, Worker
from rq_scheduler import Scheduler


manager = AppGroup(help="RQ management commands.")


@manager.command()
def scheduler():
    scheduler = Scheduler(connection=redis_connection,
                          queue_name="periodic_jobs",
                          interval=5)

    scheduler.run()


@manager.command()
@argument('queues')
def worker(queues='default'):
    with Connection(redis_connection):
        w = Worker(queues)
        w.work()
