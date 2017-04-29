import json

from flask_login import login_required
from redash import models, redis_connection
from redash.handlers import routes
from redash.handlers.base import json_response
from redash.permissions import require_super_admin
from redash.tasks.queries import QueryTaskTracker


@routes.route('/api/admin/queries/outdated', methods=['GET'])
@require_super_admin
@login_required
def outdated_queries():
    manager_status = redis_connection.hgetall('redash:status')
    query_ids = json.loads(manager_status.get('query_ids', '[]'))
    if query_ids:
        outdated_queries = (models.db.session.query(models.Query)
                            .outerjoin(models.QueryResult)
                            .filter(models.Query.id.in_(query_ids))
                            .order_by(models.Query.created_at.desc()))
    else:
        outdated_queries = []

    return json_response(
        dict(queries=[q.to_dict(with_stats=True, with_last_modified_by=False)
                      for q in outdated_queries],
             updated_at=manager_status['last_refresh_at']))


@routes.route('/api/admin/queries/tasks', methods=['GET'])
@require_super_admin
@login_required
def queries_tasks():
    waiting = QueryTaskTracker.all(QueryTaskTracker.WAITING_LIST)
    in_progress = QueryTaskTracker.all(QueryTaskTracker.IN_PROGRESS_LIST)
    done = QueryTaskTracker.all(QueryTaskTracker.DONE_LIST, limit=50)

    response = {
        'waiting': [t.data for t in waiting],
        'in_progress': [t.data for t in in_progress],
        'done': [t.data for t in done]
    }

    return json_response(response)
