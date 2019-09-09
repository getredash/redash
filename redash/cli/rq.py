from __future__ import absolute_import
import socket
import sys
import datetime

from click import argument
from flask.cli import AppGroup
from rq import Connection, Worker

from redash import redis_connection
from redash.schedule import rq_scheduler, schedule_periodic_jobs

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


@manager.command()
def healthcheck():
    hostname = socket.gethostname()
    with Connection(redis_connection):
        all_workers = Worker.all()

        local_workers = [w for w in all_workers if w.hostname == hostname]
        heartbeats = [w.last_heartbeat for w in local_workers]
        time_since_seen = [datetime.datetime.utcnow() - hb for hb in heartbeats]
        active = [t.seconds < 60 for t in time_since_seen]

        sys.exit(int(not all(active)))
