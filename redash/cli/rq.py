from __future__ import absolute_import
import socket
import sys
import datetime

from click import argument
from flask.cli import AppGroup
from rq import Connection, Worker
from sqlalchemy.orm import configure_mappers

from redash import rq_redis_connection
from redash.schedule import rq_scheduler, schedule_periodic_jobs

manager = AppGroup(help="RQ management commands.")


@manager.command()
def scheduler():
    schedule_periodic_jobs()
    rq_scheduler.run()


@manager.command()
@argument('queues', nargs=-1)
def worker(queues):
    # Configure any SQLAlchemy mappers loaded until now so that the mapping configuration 
    # will already be available to the forked work horses and they won't need 
    # to spend valuable time re-doing that on every fork.
    configure_mappers()

    if not queues:
        queues = ['periodic', 'emails', 'default', 'schemas']

    with Connection(rq_redis_connection):
        w = Worker(queues)
        w.work()


@manager.command()
def healthcheck():
    hostname = socket.gethostname()
    with Connection(rq_redis_connection):
        all_workers = Worker.all()

        local_workers = [w for w in all_workers if w.hostname == hostname]
        heartbeats = [w.last_heartbeat for w in local_workers]
        time_since_seen = [datetime.datetime.utcnow() - hb for hb in heartbeats]
        active = [t.seconds < 60 for t in time_since_seen]

        sys.exit(int(not all(active)))
