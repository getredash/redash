from datetime import timedelta
from functools import partial

from flask import current_app
import logging

from rq import get_current_job
from rq.decorators import job as rq_job

from redash import (
    create_app,
    extensions,
    settings,
    redis_connection,
    rq_redis_connection,
)

job = partial(rq_job, connection=rq_redis_connection)


class CurrentJobFilter(logging.Filter):
    def filter(self, record):
        current_job = get_current_job()

        record.job_id = current_job.id if current_job else ""
        record.job_func_name = current_job.func_name if current_job else ""

        return True


def get_job_logger(name):
    logger = logging.getLogger("rq.job." + name)

    handler = logging.StreamHandler()
    handler.formatter = logging.Formatter(settings.RQ_WORKER_JOB_LOG_FORMAT)
    handler.addFilter(CurrentJobFilter())

    logger.addHandler(handler)
    logger.propagate = False

    return logger
