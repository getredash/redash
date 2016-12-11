import time
import logging

from sqlalchemy.engine import Engine
from sqlalchemy.orm.util import _ORMJoin
from sqlalchemy.event import listens_for

from flask import has_request_context, g

from redash import statsd_client

metrics_logger = logging.getLogger("metrics")


@listens_for(Engine, "before_execute")
def before_execute(conn, elt, multiparams, params):
    conn.info.setdefault('query_start_time', []).append(time.time())


@listens_for(Engine, "after_execute")
def after_execute(conn, elt, multiparams, params, result):
    duration = 1000 * (time.time() - conn.info['query_start_time'].pop(-1))
    action = elt.__class__.__name__

    if action == 'Select':
        t = elt.froms[0]
        while isinstance(t, _ORMJoin):
            t = t.left
        name = t.name
    elif action in ['Update', 'Insert', 'Delete']:
        name = elt.table.name
    else:
        # create/drop tables, sqlalchemy internal schema queries, etc
        return

    action = action.lower()

    statsd_client.timing('db.{}.{}'.format(name, action), duration)
    metrics_logger.debug("table=%s query=%s duration=%.2f", name, action,
                         duration)

    if has_request_context():
        g.setdefault('queries_count', 0)
        g.setdefault('queries_duration', 0)
        g.queries_count += 1
        g.queries_duration += duration

    return result
