from flask import request
from flask_restful import abort
from flask_login import login_required
import sqlparse
import logging
import copy

from funcy import distinct, take
from itertools import chain

from redash.handlers.base import routes, org_scoped_rule, paginate
from redash.handlers.query_results import run_query
from redash import models
from redash.permissions import require_permission, require_access, require_admin_or_owner, not_view_only, view_only
from redash.handlers.base import BaseResource, get_object_or_404
from redash.utils import collect_parameters_from_request


@routes.route(org_scoped_rule('/api/queries/format'), methods=['POST'])
@login_required
def format_sql_query(org_slug=None):
    arguments = request.get_json(force=True)
    query = arguments.get("query", "")

    return sqlparse.format(query, reindent=True, keyword_case='upper')


def _save_change(user, query, old_query, new_query, change_type=models.Change.TYPE_MODIFY):
    if 'data_source' in new_query:
        new_query['data_source_id'] = new_query.pop('data_source')
    for field in ['data_source_id', 'user', 'last_modified_by', 'org']:
        if field in new_query:
            if isinstance(new_query[field], models.BaseModel):
                new_query[field] = new_query[field].id
    if old_query:
        for field in ['last_modified_by', 'user']:
            if field in old_query:
                if 'id' in old_query[field]:
                    old_query[field] = old_query[field]['id']
    for field in ['id', 'created_at', 'updated_at', 'latest_query_data_id',
            'latest_query_data', 'api_key', 'is_archived', 'schedule', 'query_hash']:
        if field in new_query:
            del new_query[field]
        if old_query and field in old_query:
            del old_query[field]
    change = models.Change()
    change.object_id = query.id
    change.object_type = query.__class__.__name__
    change.change_type = change_type
    change.user = user
    change.change = {
        "before": old_query,
        "after": new_query
    }
    change.save()
    return change

class QuerySearchResource(BaseResource):
    @require_permission('view_query')
    def get(self):
        term = request.args.get('q', '')

        return [q.to_dict(with_last_modified_by=False) for q in models.Query.search(term, self.current_user.groups)]


class QueryRecentResource(BaseResource):
    @require_permission('view_query')
    def get(self):
        queries = models.Query.recent(self.current_user.groups, self.current_user.id)
        recent = [d.to_dict(with_last_modified_by=False) for d in queries]

        global_recent = []
        if len(recent) < 10:
            global_recent = [d.to_dict(with_last_modified_by=False) for d in models.Query.recent(self.current_user.groups)]

        return take(20, distinct(chain(recent, global_recent), key=lambda d: d['id']))


class QueryListResource(BaseResource):
    @require_permission('create_query')
    def post(self):
        query_def = request.get_json(force=True)
        data_source = models.DataSource.get_by_id_and_org(query_def.pop('data_source_id'), self.current_org)
        require_access(data_source.groups, self.current_user, not_view_only)

        for field in ['id', 'created_at', 'api_key', 'visualizations', 'latest_query_data', 'last_modified_by']:
            query_def.pop(field, None)

        # If we already executed this query, save the query result reference
        if 'latest_query_data_id' in query_def:
            query_def['latest_query_data'] = query_def.pop('latest_query_data_id')

        query_def['user'] = self.current_user
        query_def['data_source'] = data_source
        query_def['org'] = self.current_org
        query = models.Query.create(**query_def)

        # add new Changes entry for the new query
        _save_change(self.current_user, query, None, query_def, change_type=models.Change.TYPE_CREATE)

        self.record_event({
            'action': 'create',
            'object_id': query.id,
            'object_type': 'query'
        })

        return query.to_dict()

    @require_permission('view_query')
    def get(self):
        results = models.Query.all_queries(self.current_user.groups)
        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('page_size', 25, type=int)
        return paginate(results, page, page_size, lambda q: q.to_dict(with_stats=True, with_last_modified_by=False))


class MyQueriesResource(BaseResource):
    @require_permission('view_query')
    def get(self):
        drafts = request.args.get('drafts') is not None
        results = models.Query.by_user(self.current_user, drafts)
        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('page_size', 25, type=int)
        return paginate(results, page, page_size, lambda q: q.to_dict(with_stats=True, with_last_modified_by=False))


class QueryResource(BaseResource):
    @require_permission('edit_query')
    def post(self, query_id):
        query = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)
        query_def = request.get_json(force=True)

        # check access permissions
        if self.current_user.id != query.user.id:
            if not self.current_user.has_access(
                    access_type=models.AccessPermission.ACCESS_TYPE_MODIFY,
                    object_id=query.id,
                    object_type=models.Query.__name__):
                require_admin_or_owner(query.user_id)

        # Optimistic locking: figure out which user made the last
        # change to this query, and bail out if necessary
        last_change = models.Change.get_latest(object_id=query.id, object_type=models.Query.__name__)
        if last_change and 'latest_version' in query_def:
            if last_change.id > query_def['latest_version']:
                abort(409) # HTTP 'Conflict' status code
                return

        for field in ['id', 'created_at', 'api_key', 'visualizations', 'latest_query_data', 'user', 'last_modified_by', 'org']:
            query_def.pop(field, None)

        if 'latest_query_data_id' in query_def:
            query_def['latest_query_data'] = query_def.pop('latest_query_data_id')

        if 'data_source_id' in query_def:
            query_def['data_source'] = query_def.pop('data_source_id')

        query_def['last_modified_by'] = self.current_user

        # create a new Changes record to keep track of the changes
        new_query = copy.deepcopy(query_def)
        old_query = copy.deepcopy(query.to_dict())
        new_change = _save_change(self.current_user, query, old_query, new_query)

        query.update_instance(**query_def)

        result = query.to_dict(with_visualizations=True)
        result['latest_version'] = new_change.id
        return result


    @require_permission('view_query')
    def get(self, query_id):
        q = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)
        require_access(q.groups, self.current_user, view_only)

        if q:
            result = q.to_dict(with_visualizations=True)
            last_change = models.Change.get_latest(object_id=query_id, object_type=models.Query.__name__)
            if last_change:
                result['latest_version'] = last_change.id
            return result
        else:
            abort(404, message="Query not found.")

    # TODO: move to resource of its own? (POST /queries/{id}/archive)
    def delete(self, query_id):
        query = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)
        require_admin_or_owner(query.user_id)
        query.archive()


class QueryRefreshResource(BaseResource):
    def post(self, query_id):
        query = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)
        require_access(query.groups, self.current_user, not_view_only)

        parameter_values = collect_parameters_from_request(request.args)

        return run_query(query.data_source, parameter_values, query.query, query.id)


