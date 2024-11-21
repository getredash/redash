import errno
import os
import signal
import sys

from rq import Queue as BaseQueue
from rq.job import Job as BaseJob
from rq.job import JobStatus
from rq.timeouts import HorseMonitorTimeoutException
from rq.utils import utcnow
from rq.worker import (
    HerokuWorker,  # HerokuWorker implements graceful shutdown on SIGTERM
    Worker,
)

from redash import statsd_client

# HerokuWorker does not work in OSX https://github.com/getredash/redash/issues/5413
if sys.platform == "darwin":
    BaseWorker = Worker
else:
    BaseWorker = HerokuWorker


class CancellableJob(BaseJob):
    def cancel(self, pipeline=None):
        self.meta["cancelled"] = True
        self.save_meta()

        super().cancel(pipeline=pipeline)

    @property
    def is_cancelled(self):
        return self.meta.get("cancelled", False)


class StatsdRecordingQueue(BaseQueue):
    """
    RQ Queue Mixin that overrides `enqueue_call` to increment metrics via Statsd
    """

    def enqueue_job(self, *args, **kwargs):
        job = super().enqueue_job(*args, **kwargs)
        statsd_client.incr("rq.jobs.created.{}".format(self.name))
        return job


class CancellableQueue(BaseQueue):
    job_class = CancellableJob


class RedashQueue(StatsdRecordingQueue, CancellableQueue):
    pass


class StatsdRecordingWorker(BaseWorker):
    """
    RQ Worker Mixin that overrides `execute_job` to increment/modify metrics via Statsd
    """

    def execute_job(self, job, queue):
        statsd_client.incr("rq.jobs.running.{}".format(queue.name))
        statsd_client.incr("rq.jobs.started.{}".format(queue.name))
        try:
            super().execute_job(job, queue)
        finally:
            statsd_client.decr("rq.jobs.running.{}".format(queue.name))
            if job.get_status() == JobStatus.FINISHED:
                statsd_client.incr("rq.jobs.finished.{}".format(queue.name))
            else:
                statsd_client.incr("rq.jobs.failed.{}".format(queue.name))


class HardLimitingWorker(BaseWorker):
    """
    RQ's work horses enforce time limits by setting a timed alarm and stopping jobs
    when they reach their time limits. However, the work horse may be entirely blocked
    and may not respond to the alarm interrupt. Since respecting timeouts is critical
    in Redash (if we don't respect them, workers may be infinitely stuck and as a result,
    service may be denied for other queries), we enforce two time limits:
    1. A soft time limit, enforced by the work horse
    2. A hard time limit, enforced by the parent worker

    The HardLimitingWorker class changes the default monitoring behavior of the default
    RQ Worker by checking if the work horse is still busy with the job, even after
    it should have timed out (+ a grace period of 15s). If it does, it kills the work horse.
    """

    grace_period = 15
    queue_class = RedashQueue
    job_class = CancellableJob

    def stop_executing_job(self, job):
        os.kill(self.horse_pid, signal.SIGINT)
        self.log.warning("Job %s has been cancelled.", job.id)

    def soft_limit_exceeded(self, job):
        job_has_time_limit = job.timeout != -1

        if job_has_time_limit:
            seconds_under_monitor = (utcnow() - self.monitor_started).seconds
            return seconds_under_monitor > job.timeout + self.grace_period
        else:
            return False

    def enforce_hard_limit(self, job):
        self.log.warning(
            "Job %s exceeded timeout of %ds (+%ds grace period) but work horse did not terminate it. "
            "Killing the work horse.",
            job.id,
            job.timeout,
            self.grace_period,
        )
        self.kill_horse()

    def monitor_work_horse(self, job: "Job", queue: "Queue"):
        """The worker will monitor the work horse and make sure that it
        either executes successfully or the status of the job is set to
        failed

        Args:
            job (Job): _description_
            queue (Queue): _description_
        """
        self.monitor_started = utcnow()
        retpid = ret_val = rusage = None
        job.started_at = utcnow()
        while True:
            try:
                with self.death_penalty_class(self.job_monitoring_interval, HorseMonitorTimeoutException):
                    retpid, ret_val, rusage = self.wait_for_horse()
                break
            except HorseMonitorTimeoutException:
                # Horse has not exited yet and is still running.
                # Send a heartbeat to keep the worker alive.
                self.set_current_job_working_time((utcnow() - job.started_at).total_seconds())

                job.refresh()
                # Kill the job from this side if something is really wrong (interpreter lock/etc).
                if job.timeout != -1 and self.current_job_working_time > (job.timeout + 60):  # type: ignore
                    self.heartbeat(self.job_monitoring_interval + 60)
                    self.kill_horse()
                    self.wait_for_horse()
                    break

                self.maintain_heartbeats(job)

                if job.is_cancelled:
                    self.stop_executing_job(job)

                if self.soft_limit_exceeded(job):
                    self.enforce_hard_limit(job)

            except OSError as e:
                # In case we encountered an OSError due to EINTR (which is
                # caused by a SIGINT or SIGTERM signal during
                # os.waitpid()), we simply ignore it and enter the next
                # iteration of the loop, waiting for the child to end.  In
                # any other case, this is some other unexpected OS error,
                # which we don't want to catch, so we re-raise those ones.
                if e.errno != errno.EINTR:
                    raise
                # Send a heartbeat to keep the worker alive.
                self.heartbeat()

        self.set_current_job_working_time(0)
        self._horse_pid = 0  # Set horse PID to 0, horse has finished working
        if ret_val == os.EX_OK:  # The process exited normally.
            return

        job_status = job.get_status()

        if job_status is None:  # Job completed and its ttl has expired
            return
        elif self._stopped_job_id == job.id:
            # Work-horse killed deliberately
            self.log.warning("Job stopped by user, moving job to FailedJobRegistry")
            if job.stopped_callback:
                job.execute_stopped_callback(self.death_penalty_class)
            self.handle_job_failure(job, queue=queue, exc_string="Job stopped by user, work-horse terminated.")
        elif job_status not in [JobStatus.FINISHED, JobStatus.FAILED]:
            if not job.ended_at:
                job.ended_at = utcnow()

            # Unhandled failure: move the job to the failed queue
            signal_msg = f" (signal {os.WTERMSIG(ret_val)})" if ret_val and os.WIFSIGNALED(ret_val) else ""
            exc_string = f"Work-horse terminated unexpectedly; waitpid returned {ret_val}{signal_msg}; "
            self.log.warning("Moving job to FailedJobRegistry (%s)", exc_string)

            self.handle_work_horse_killed(job, retpid, ret_val, rusage)
            self.handle_job_failure(job, queue=queue, exc_string=exc_string)


class RedashWorker(StatsdRecordingWorker, HardLimitingWorker):
    queue_class = RedashQueue


Job = CancellableJob
Queue = RedashQueue
Worker = RedashWorker
