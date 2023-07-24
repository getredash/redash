import datetime
import socket
from itertools import chain

from click import argument
from flask.cli import AppGroup
from rq import Connection
from rq.worker import WorkerStatus
from sqlalchemy.orm import configure_mappers
from supervisor_checks import check_runner
from supervisor_checks.check_modules import base

from redash import rq_redis_connection
from redash.tasks import (
    periodic_job_definitions,
    rq_scheduler,
    schedule_periodic_jobs,
)
from redash.tasks.worker import Worker
from redash.worker import default_queues

manager = AppGroup(help="RQ management commands.")


@manager.command()
def scheduler():
    jobs = periodic_job_definitions()
    schedule_periodic_jobs(jobs)
    rq_scheduler.run()


@manager.command()
@argument("queues", nargs=-1)
def worker(queues):
    # Configure any SQLAlchemy mappers loaded until now so that the mapping configuration
    # will already be available to the forked work horses and they won't need
    # to spend valuable time re-doing that on every fork.
    configure_mappers()

    if not queues:
        queues = default_queues
    else:
        queues = chain(*[queue.split(",") for queue in queues])

    with Connection(rq_redis_connection):
        w = Worker(queues, log_job_description=False, job_monitoring_interval=5)
        w.work()


class WorkerHealthcheck(base.BaseCheck):
    NAME = "RQ Worker Healthcheck"

    def __call__(self, process_spec):
        pid = process_spec["pid"]
        all_workers = Worker.all(connection=rq_redis_connection)
        workers = [w for w in all_workers if w.hostname == socket.gethostname() and w.pid == pid]

        if not workers:
            self._log(f"Cannot find worker for hostname {socket.gethostname()} and pid {pid}. ==> Is healthy? False")
            return False

        worker = workers.pop()

        is_busy = worker.get_state() == WorkerStatus.BUSY

        time_since_seen = datetime.datetime.utcnow() - worker.last_heartbeat
        seen_lately = time_since_seen.seconds < 60

        total_jobs_in_watched_queues = sum([len(q.jobs) for q in worker.queues])
        has_nothing_to_do = total_jobs_in_watched_queues == 0

        is_healthy = is_busy or seen_lately or has_nothing_to_do

        self._log(
            "Worker %s healthcheck: Is busy? %s. "
            "Seen lately? %s (%d seconds ago). "
            "Has nothing to do? %s (%d jobs in watched queues). "
            "==> Is healthy? %s",
            worker.key,
            is_busy,
            seen_lately,
            time_since_seen.seconds,
            has_nothing_to_do,
            total_jobs_in_watched_queues,
            is_healthy,
        )

        return is_healthy


@manager.command()
def healthcheck():
    return check_runner.CheckRunner("worker_healthcheck", "worker", None, [(WorkerHealthcheck, {})]).run()
