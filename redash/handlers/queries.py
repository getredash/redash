from flask import request, redirect
from flask.ext.restful import abort
from flask_login import current_user, login_required
import sqlparse

from funcy import distinct
from itertools import chain

from redash import models
from redash.wsgi import app, api
from redash.permissions import require_permission
from redash.handlers.base import BaseResource


@app.route('/api/queries/format', methods=['POST'])
@login_required
def format_sql_query():
    arguments = request.get_json(force=True)
    query = arguments.get("query", "")

    return sqlparse.format(query, reindent=True, keyword_case='upper')


@app.route('/queries/new', methods=['POST'])
@login_required
def create_query_route():
    query = request.form.get('query', None)
    data_source_id = request.form.get('data_source_id', None)

    if query is None or data_source_id is None:
        abort(400)

    query = models.Query.create(name="New Query",
                                query=query,
                                data_source=data_source_id,
                                user=current_user._get_current_object(),
                                schedule=None)

    return redirect('/queries/{}'.format(query.id), 303)


class QuerySearchAPI(BaseResource):
    @require_permission('view_query')
    def get(self):
        term = request.args.get('q', '')

        return [q.to_dict() for q in models.Query.search(term)]


class QueryRecentAPI(BaseResource):
    @require_permission('view_query')
    def get(self):
        recent = [d.to_dict() for d in models.Query.recent(current_user.id)]

        global_recent = []
        if len(recent) < 10:
            global_recent = [d.to_dict() for d in models.Query.recent()]

        return distinct(chain(recent, global_recent), key=lambda d: d['id'])


class QueryListAPI(BaseResource):
    @require_permission('create_query')
    def post(self):
        query_def = request.get_json(force=True)
        for field in ['id', 'created_at', 'api_key', 'visualizations', 'latest_query_data', 'last_modified_by']:
            query_def.pop(field, None)

        query_def['user'] = self.current_user
        query_def['data_source'] = query_def.pop('data_source_id')
        query = models.Query(**query_def)
        query.save()

        return query.to_dict()

    @require_permission('view_query')
    def get(self):
        return [q.to_dict(with_stats=True) for q in models.Query.all_queries()]


class QueryAPI(BaseResource):
    @require_permission('edit_query')
    def post(self, query_id):
        query = models.Query.get_by_id(query_id)

        query_def = request.get_json(force=True)
        for field in ['id', 'created_at', 'api_key', 'visualizations', 'latest_query_data', 'user', 'last_modified_by']:
            query_def.pop(field, None)

        if 'latest_query_data_id' in query_def:
            query_def['latest_query_data'] = query_def.pop('latest_query_data_id')

        if 'data_source_id' in query_def:
            query_def['data_source'] = query_def.pop('data_source_id')

        query_def['last_modified_by'] = self.current_user

        # TODO: use #save() with #dirty_fields.
        models.Query.update_instance(query_id, **query_def)

        query = models.Query.get_by_id(query_id)

        return query.to_dict(with_visualizations=True)

    @require_permission('view_query')
    def get(self, query_id):
        q = models.Query.get(models.Query.id == query_id)
        if q:
            return q.to_dict(with_visualizations=True)
        else:
            abort(404, message="Query not found.")

    # TODO: move to resource of its own? (POST /queries/{id}/archive)
    def delete(self, query_id):
        q = models.Query.get(models.Query.id == query_id)

        if q:
            if q.user.id == self.current_user.id or self.current_user.has_permission('admin'):
                q.archive()
            else:
                abort(403)
        else:
            abort(404, message="Query not found.")

api.add_resource(QuerySearchAPI, '/api/queries/search', endpoint='queries_search')
api.add_resource(QueryRecentAPI, '/api/queries/recent', endpoint='recent_queries')
api.add_resource(QueryListAPI, '/api/queries', endpoint='queries')
api.add_resource(QueryAPI, '/api/queries/<query_id>', endpoint='query')
