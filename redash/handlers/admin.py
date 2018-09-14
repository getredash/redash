from flask import request
from flask_login import login_required

from redash import models, redis_connection
from redash.handlers import routes
from redash.handlers.base import json_response
from redash.permissions import require_super_admin
from redash.serializers import QuerySerializer
from redash.tasks import record_event
from redash.tasks.queries import QueryTaskTracker
from redash.utils import json_loads


@routes.route('/api/admin/queries/outdated', methods=['GET'])
@require_super_admin
@login_required
def outdated_queries():
    manager_status = redis_connection.hgetall('redash:status')
    query_ids = json_loads(manager_status.get('query_ids', '[]'))
    if query_ids:
        outdated_queries = (
            models.Query.query.outerjoin(models.QueryResult)
                              .filter(models.Query.id.in_(query_ids))
                              .order_by(models.Query.created_at.desc())
        )
    else:
        outdated_queries = []

    record_event({
        'action': 'list',
        'object_type': 'outdated_queries',
    })

    response = {
        'queries': QuerySerializer(outdated_queries, with_stats=True, with_last_modified_by=False).serialize(),
        'updated_at': manager_status['last_refresh_at'],
    }
    return json_response(response)


@routes.route('/api/admin/queries/tasks', methods=['GET'])
@require_super_admin
@login_required
def queries_tasks():
    record_event({
        'action': 'list',
        'object_id': 'admin/tasks',
        'object_type': 'celery_tasks'
    })

    global_limit = int(request.args.get('limit', 50))
    waiting_limit = int(request.args.get('waiting_limit', global_limit))
    progress_limit = int(request.args.get('progress_limit', global_limit))
    done_limit = int(request.args.get('done_limit', global_limit))

    waiting = QueryTaskTracker.all(QueryTaskTracker.WAITING_LIST, limit=waiting_limit)
    in_progress = QueryTaskTracker.all(QueryTaskTracker.IN_PROGRESS_LIST, limit=progress_limit)
    done = QueryTaskTracker.all(QueryTaskTracker.DONE_LIST, limit=done_limit)

    response = {
        'waiting': [t.data for t in waiting if t is not None],
        'in_progress': [t.data for t in in_progress if t is not None],
        'done': [t.data for t in done if t is not None]
    }

    return json_response(response)
