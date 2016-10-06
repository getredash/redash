from __future__ import absolute_import

import logging
import time
import json
import socket
from celery.signals import task_prerun, task_postrun
from redash import statsd_client, settings

tasks_start_time = {}


@task_prerun.connect
def task_prerun_handler(signal, sender, task_id, task, args, kwargs):
    try:
        tasks_start_time[task_id] = time.time()
    except Exception:
        logging.exception("Exception during task_prerun handler:")


def metric_name(name, tags):
    # TODO: use some of the tags in the metric name if tags are not supported
    # TODO: support additional tag formats (this one is for InfluxDB)
    if not settings.STATSD_USE_TAGS:
        return name

    tags_string = ",".join(["{}={}".format(k, v) for k, v in tags.iteritems()])
    return "{},{}".format(name, tags_string)


@task_postrun.connect
def task_postrun_handler(signal, sender, task_id, task, args, kwargs, retval, state):
    try:
        run_time = 1000 * (time.time() - tasks_start_time.pop(task_id))

        tags = {'name': task.name, 'state': (state or 'unknown').lower(), 'hostname': socket.gethostname()}
        if task.name == 'redash.tasks.execute_query':
            if isinstance(retval, Exception):
                tags['state'] = 'exception'

            tags['data_source_id'] = args[1]

        metric = "celery.task.runtime"
        logging.debug("metric=%s", json.dumps({'metric': metric, 'tags': tags, 'value': run_time}))
        statsd_client.timing(metric_name(metric, tags), run_time)
        statsd_client.incr(metric_name('celery.task.count', tags))
    except Exception:
        logging.exception("Exception during task_postrun handler.")
