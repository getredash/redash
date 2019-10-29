from __future__ import absolute_import
import socket
import sys
import datetime

from honcho.manager import Manager
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
@argument('workers_count')
@argument('queues', nargs=-1)
def workers(workers_count=1, queues='default'):
    m = Manager()
    for i in range(int(workers_count)):
        cmd = './manage.py rq worker {}'.format(" ".join(queues))
        m.add_process('worker #{}'.format(i+1), cmd)

    m.loop()
    sys.exit(m.returncode)


@manager.command()
@argument('queues', nargs=-1)
def worker(queues='default'):
    # Configure any SQLAlchemy mappers loaded until now so that the mapping configuration 
    # will already be available to the forked work horses and they won't need 
    # to spend valuable time re-doing that on every fork.
    configure_mappers()

    if not queues:
        queues = ('default',)
    with Connection(rq_redis_connection):
        w = Worker(queues)
        w.work()


@manager.command()
def healthcheck():
    hostname = socket.gethostname()
    with Connection(rq_redis_connection):
        all_workers = Worker.all()

        local_workers = [w for w in all_workers if w.hostname.decode() == hostname]
        row_format ="{:>10}" * (len(local_workers) + 1)

        print("Local worker PIDs:")
        local_worker_pids = set([w.pid for w in local_workers])
        print(row_format.format("", *local_worker_pids))

        print("Time since seen:")
        heartbeats = [w.last_heartbeat for w in local_workers]
        time_since_seen = [datetime.datetime.utcnow() - hb for hb in heartbeats]
        print(row_format.format("", *[t.seconds for t in time_since_seen]))
        seen_lately = [t.seconds < 60 for t in time_since_seen]

        print("State:")
        states = [w.state for w in local_workers]
        print(row_format.format("", *states))
        busy = [s == "busy" for s in states]

        print("Jobs in queues:")
        jobs_in_queues = [sum([len(q.jobs) for q in w.queues]) for w in local_workers]
        print(row_format.format("", *jobs_in_queues))
        has_nothing_to_do = [j == 0 for j in jobs_in_queues]

        print("Healty:")
        # a healthy worker is either busy, has been seen lately or has nothing to do
        healthy = [any(w) for w in zip(busy, seen_lately, has_nothing_to_do)]
        print(row_format.format("", *healthy))

        sys.exit(int(not all(healthy)))
