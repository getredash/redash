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
    """
    Formats an SQL query using the Python ``sqlparse`` formatter.

    :<json string query: The SQL text to format
    :>json string query: Formatted SQL text
    """
    arguments = request.get_json(force=True)
    query = arguments.get("query", "")

    return jsonify({'query': sqlparse.format(query, reindent=True, keyword_case='upper')})


class QuerySearchResource(BaseResource):
    @require_permission('view_query')
    def get(self):
        """
        Search query text, titles, and descriptions.

        :qparam string q: Search term

        Responds with a list of :ref:`query <query-response-label>` objects.
        """
        term = request.args.get('q', '')
        include_drafts = request.args.get('include_drafts') is not None

        return [q.to_dict(with_last_modified_by=False) for q in models.Query.search(term, self.current_user.group_ids, include_drafts=include_drafts)]


class QueryRecentResource(BaseResource):
    @require_permission('view_query')
    def get(self):
        """
        Retrieve up to 20 queries modified in the last 7 days.

        Responds with a list of :ref:`query <query-response-label>` objects.
        """
        queries = models.Query.recent(self.current_user.group_ids, self.current_user.id)
        recent = [d.to_dict(with_last_modified_by=False) for d in queries]

        global_recent = []
        if len(recent) < 10:
            global_recent = [d.to_dict(with_last_modified_by=False) for d in models.Query.recent(self.current_user.group_ids)]

        return take(20, distinct(chain(recent, global_recent), key=lambda d: d['id']))


class QueryListResource(BaseResource):
    @require_permission('create_query')
    def post(self):
        """
        Create a new query.

        :<json number data_source_id: The ID of the data source this query will run on
        :<json string query: Query text
        :<json string name:
        :<json string description:
        :<json string schedule: Schedule interval, in seconds, for repeated execution of this query
        :<json object options: Query options

        .. _query-response-label:

        :>json number id: Query ID
        :>json number latest_query_data_id: ID for latest output data from this query
        :>json string name:
        :>json string description:
        :>json string query: Query text
        :>json string query_hash: Hash of query text
        :>json string schedule: Schedule interval, in seconds, for repeated execution of this query
        :>json string api_key: Key for public access to this query's results.
        :>json boolean is_archived: Whether this query is displayed in indexes and search results or not.
        :>json boolean is_draft: Whether this query is a draft or not
        :>json string updated_at: Time of last modification, in ISO format
        :>json string created_at: Time of creation, in ISO format
        :>json number data_source_id: ID of the data source this query will run on
        :>json object options: Query options
        :>json number version: Revision version (for update conflict avoidance)
        :>json number user_id: ID of query creator
        :>json number last_modified_by_id: ID of user who last modified this query
        :>json string retrieved_at: Time when query results were last retrieved, in ISO format (may be null)
        :>json number runtime: Runtime of last query execution, in seconds (may be null)
        """
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
        models.db.session.commit()

        self.record_event({
            'action': 'create',
            'object_id': query.id,
            'object_type': 'query'
        })

        return query.to_dict()

    @require_permission('view_query')
    def get(self):
        """
        Retrieve a list of queries.

        :qparam number page_size: Number of queries to return
        :qparam number page: Page number to retrieve

        Responds with an array of :ref:`query <query-response-label>` objects.
        """
        
        results = models.Query.all_queries(self.current_user.group_ids, self.current_user.id)
        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('page_size', 25, type=int)
        return paginate(results, page, page_size, lambda q: q.to_dict(with_stats=True, with_last_modified_by=False))


class MyQueriesResource(BaseResource):
    @require_permission('view_query')
    def get(self):
        """
        Retrieve a list of queries created by the current user.

        :qparam number page_size: Number of queries to return
        :qparam number page: Page number to retrieve

        Responds with an array of :ref:`query <query-response-label>` objects.
        """
        drafts = request.args.get('drafts') is not None
        results = models.Query.by_user(self.current_user)
        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('page_size', 25, type=int)
        return paginate(results, page, page_size, lambda q: q.to_dict(with_stats=True, with_last_modified_by=False))


class QueryResource(BaseResource):
    @require_permission('edit_query')
    def post(self, query_id):
        """
        Modify a query.

        :param query_id: ID of query to update
        :<json number data_source_id: The ID of the data source this query will run on
        :<json string query: Query text
        :<json string name:
        :<json string description:
        :<json string schedule: Schedule interval, in seconds, for repeated execution of this query
        :<json object options: Query options

        Responds with the updated :ref:`query <query-response-label>` object.
        """
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
        """
        Retrieve a query.

        :param query_id: ID of query to fetch

        Responds with the :ref:`query <query-response-label>` contents.
        """
        q = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)
        require_access(q.groups, self.current_user, view_only)

        result = q.to_dict(with_visualizations=True)
        result['can_edit'] = can_modify(q, self.current_user)
        return result

    # TODO: move to resource of its own? (POST /queries/{id}/archive)
    def delete(self, query_id):
        """
        Archives a query.

        :param query_id: ID of query to archive
        """
        query = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)
        require_admin_or_owner(query.user_id)
        query.archive(self.current_user)
        models.db.session.commit()


class QueryForkResource(BaseResource):
    @require_permission('edit_query')
    def post(self, query_id):
        """
        Creates a new query, copying the query text from an existing one.

        :param query_id: ID of query to fork

        Responds with created :ref:`query <query-response-label>` object.
        """
        query = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)
        forked_query = query.fork(self.current_user)
        models.db.session.commit()
        return forked_query.to_dict(with_visualizations=True)


class QueryRefreshResource(BaseResource):
    def post(self, query_id):
        """
        Execute a query, updating the query object with the results.

        :param query_id: ID of query to execute

        Responds with query task details.
        """
        query = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)
        require_access(query.groups, self.current_user, not_view_only)

        parameter_values = collect_parameters_from_request(request.args)

        return run_query(query.data_source, parameter_values, query.query_text, query.id)
