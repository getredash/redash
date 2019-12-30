import errno
import os
import signal
import time
from rq import Worker as BaseWorker, Queue as BaseQueue, get_current_job
from rq.utils import utcnow
from rq.timeouts import UnixSignalDeathPenalty, HorseMonitorTimeoutException
from rq.job import Job as BaseJob, JobStatus


class CancellableJob(BaseJob):
    def cancel(self, pipeline=None):
        # TODO - add tests that verify that queued jobs are removed from queue and running jobs are actively cancelled
        if self.is_started:
            self.meta["cancelled"] = True
            self.save_meta()

        super().cancel(pipeline=pipeline)

    @property
    def is_cancelled(self):
        return self.meta.get("cancelled", False)


class CancellableQueue(BaseQueue):
    job_class = CancellableJob


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
    queue_class = CancellableQueue
    job_class = CancellableJob

    def stop_executing_job(self, job):
        os.kill(self.horse_pid, signal.SIGINT)
        self.log.warning("Job %s has been cancelled.", job.id)

    def soft_limit_exceeded(self, job):
        seconds_under_monitor = (utcnow() - self.monitor_started).seconds
        return seconds_under_monitor > job.timeout + self.grace_period

    def enforce_hard_limit(self, job):
        self.log.warning(
            "Job %s exceeded timeout of %ds (+%ds grace period) but work horse did not terminate it. "
            "Killing the work horse.",
            job.id,
            job.timeout,
            self.grace_period,
        )
        self.kill_horse()

    def monitor_work_horse(self, job):
        """The worker will monitor the work horse and make sure that it
        either executes successfully or the status of the job is set to
        failed
        """
        self.monitor_started = utcnow()
        while True:
            try:
                with UnixSignalDeathPenalty(
                    self.job_monitoring_interval, HorseMonitorTimeoutException
                ):
                    retpid, ret_val = os.waitpid(self._horse_pid, 0)
                break
            except HorseMonitorTimeoutException:
                # Horse has not exited yet and is still running.
                # Send a heartbeat to keep the worker alive.
                self.heartbeat(self.job_monitoring_interval + 5)

                job.refresh()

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

        if ret_val == os.EX_OK:  # The process exited normally.
            return
        job_status = job.get_status()
        if job_status is None:  # Job completed and its ttl has expired
            return
        if job_status not in [JobStatus.FINISHED, JobStatus.FAILED]:

            if not job.ended_at:
                job.ended_at = utcnow()

            # Unhandled failure: move the job to the failed queue
            self.log.warning(
                (
                    "Moving job to FailedJobRegistry "
                    "(work-horse terminated unexpectedly; waitpid returned {})"
                ).format(ret_val)
            )

            self.handle_job_failure(
                job,
                exc_string="Work-horse process was terminated unexpectedly "
                "(waitpid returned %s)" % ret_val,
            )


Job = CancellableJob
Queue = CancellableQueue
Worker = HardLimitingWorker
