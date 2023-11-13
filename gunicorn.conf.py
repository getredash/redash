import traceback

# Async workers - https://docs.gunicorn.org/en/stable/design.html#async-workers
# These can handle more concurrent requests than sync workers (non-blocking)
worker_class = 'gevent'

# See https://docs.gunicorn.org/en/stable/settings.html#worker-processes and
#       https://github.com/benoitc/gunicorn/issues/1493
graceful_timeout = 300
timeout = 300

def worker_abort(worker):
    worker.log.info("worker received SIGABRT signal")
    traceback.print_stack()

