import logging
import socket
import time
from redash import settings

from celery.concurrency import asynpool

asynpool.PROC_ALIVE_TIMEOUT = settings.CELERY_INIT_TIMEOUT

from celery.signals import task_postrun, task_prerun
from redash import settings, statsd_client
from redash.utils import json_dumps

tasks_start_time = {}


@task_prerun.connect
def task_prerun_handler(signal, sender, task_id, task, args, kwargs, **kw):
    try:
        tasks_start_time[task_id] = time.time()
    except Exception:
        logging.exception("Exception during task_prerun handler:")


def metric_name(name, tags):
    # TODO: use some of the tags in the metric name if tags are not supported
    # TODO: support additional tag formats (this one is for InfluxDB)
    if not settings.STATSD_USE_TAGS:
        return name

    tags_string = ",".join(["{}={}".format(k, v) for k, v in tags.items()])
    return "{},{}".format(name, tags_string)


@task_postrun.connect
def task_postrun_handler(
    signal, sender, task_id, task, args, kwargs, retval, state, **kw
):
    try:
        run_time = 1000 * (time.time() - tasks_start_time.pop(task_id))

        state = (state or "unknown").lower()
        tags = {"state": state, "hostname": socket.gethostname()}
        if task.name == "redash.tasks.execute_query":
            if isinstance(retval, Exception):
                tags["state"] = "exception"
                state = "exception"

            tags["data_source_id"] = args[1]

        normalized_task_name = task.name.replace("redash.tasks.", "").replace(".", "_")
        metric = "celery.task_runtime.{}".format(normalized_task_name)
        logging.debug(
            "metric=%s", json_dumps({"metric": metric, "tags": tags, "value": run_time})
        )
        statsd_client.timing(metric_name(metric, tags), run_time)
        statsd_client.incr(
            metric_name("celery.task.{}.{}".format(normalized_task_name, state), tags)
        )
    except Exception:
        logging.exception("Exception during task_postrun handler.")
