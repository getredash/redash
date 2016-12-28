from itertools import chain

import sqlparse
from flask import jsonify, request
from flask_login import login_required
from flask_restful import abort
from funcy import distinct, take
from sqlalchemy.orm.exc import StaleDataError

from redash import models
from redash.handlers.base import (BaseResource, get_object_or_404,
                                  org_scoped_rule, paginate, routes)
from redash.handlers.query_results import run_query
from redash.permissions import (can_modify, not_view_only, require_access,
                                require_admin_or_owner,
                                require_object_modify_permission,
                                require_permission, view_only)
from redash.utils import collect_parameters_from_request


@routes.route(org_scoped_rule('/api/queries/format'), methods=['POST'])
@login_required
def format_sql_query(org_slug=None):
    arguments = request.get_json(force=True)
    query = arguments.get("query", "")

    return jsonify({'query': sqlparse.format(query, reindent=True, keyword_case='upper')})


class QuerySearchResource(BaseResource):
    @require_permission('view_query')
    def get(self):
        term = request.args.get('q', '')

        return [q.to_dict(with_last_modified_by=False) for q in models.Query.search(term, self.current_user.group_ids)]


class QueryRecentResource(BaseResource):
    @require_permission('view_query')
    def get(self):
        queries = models.Query.recent(self.current_user.group_ids, self.current_user.id)
        recent = [d.to_dict(with_last_modified_by=False) for d in queries]

        global_recent = []
        if len(recent) < 10:
            global_recent = [d.to_dict(with_last_modified_by=False) for d in models.Query.recent(self.current_user.group_ids)]

        return take(20, distinct(chain(recent, global_recent), key=lambda d: d['id']))


class QueryListResource(BaseResource):
    @require_permission('create_query')
    def post(self):
        query_def = request.get_json(force=True)
        data_source = models.DataSource.get_by_id_and_org(query_def.pop('data_source_id'), self.current_org)
        require_access(data_source.groups, self.current_user, not_view_only)

        for field in ['id', 'created_at', 'api_key', 'visualizations', 'latest_query_data', 'last_modified_by']:
            query_def.pop(field, None)

        query_def['query_text'] = query_def.pop('query')
        query_def['user'] = self.current_user
        query_def['data_source'] = data_source
        query_def['org'] = self.current_org
        query_def['is_draft'] = True
        query = models.Query.create(**query_def)
        models.db.session.add(query)

        self.record_event({
            'action': 'create',
            'object_id': query.id,
            'object_type': 'query'
        })
        models.db.session.commit()
        return query.to_dict()

    @require_permission('view_query')
    def get(self):
        results = models.Query.all_queries(self.current_user.group_ids)
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

        require_object_modify_permission(query, self.current_user)

        for field in ['id', 'created_at', 'api_key', 'visualizations', 'latest_query_data', 'user', 'last_modified_by', 'org']:
            query_def.pop(field, None)

        if 'query' in query_def:
            query_def['query_text'] = query_def.pop('query')

        query_def['last_modified_by'] = self.current_user
        query_def['changed_by'] = self.current_user
        # SQLAlchemy handles the case where a concurrent transaction beats us
        # to the update. But we still have to make sure that we're not starting
        # out behind.
        if 'version' in query_def and query_def['version'] != query.version:
            abort(409)

        try:
            self.update_model(query, query_def)
            models.db.session.commit()
        except StaleDataError:
            abort(409)

        return query.to_dict(with_visualizations=True)

    @require_permission('view_query')
    def get(self, query_id):
        q = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)
        require_access(q.groups, self.current_user, view_only)

        result = q.to_dict(with_visualizations=True)
        result['can_edit'] = can_modify(q, self.current_user)
        return result

    # TODO: move to resource of its own? (POST /queries/{id}/archive)
    def delete(self, query_id):
        query = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)
        require_admin_or_owner(query.user_id)
        query.archive(self.current_user)
        models.db.session.commit()


class QueryForkResource(BaseResource):
    @require_permission('edit_query')
    def post(self, query_id):
        query = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)
        forked_query = query.fork(self.current_user)
        models.db.session.commit()
        return forked_query.to_dict(with_visualizations=True)


class QueryRefreshResource(BaseResource):
    def post(self, query_id):
        query = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)
        require_access(query.groups, self.current_user, not_view_only)

        parameter_values = collect_parameters_from_request(request.args)

        return run_query(query.data_source, parameter_values, query.query_text, query.id)
