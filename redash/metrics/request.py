import logging
import time
from collections import namedtuple

from flask import g, request
from redash import statsd_client

metrics_logger = logging.getLogger("metrics")


def record_requets_start_time():
    g.start_time = time.time()


def calculate_metrics(response):
    if 'start_time' not in g:
        return response

    request_duration = (time.time() - g.start_time) * 1000
    queries_duration = g.get('queries_duration', 0.0)
    queries_count = g.get('queries_count', 0.0)

    metrics_logger.info("method=%s path=%s endpoint=%s status=%d content_type=%s content_length=%d duration=%.2f query_count=%d query_duration=%.2f",
                        request.method,
                        request.path,
                        request.endpoint,
                        response.status_code,
                        response.content_type,
                        response.content_length,
                        request_duration,
                        queries_count,
                        queries_duration)

    statsd_client.timing('requests.{}.{}'.format(request.endpoint, request.method.lower()), request_duration)

    return response

MockResponse = namedtuple('MockResponse', ['status_code', 'content_type', 'content_length'])


def calculate_metrics_on_exception(error):
    if error is not None:
        calculate_metrics(MockResponse(500, '?', -1))


def provision_app(app):
    app.before_request(record_requets_start_time)
    app.after_request(calculate_metrics)
    app.teardown_request(calculate_metrics_on_exception)
