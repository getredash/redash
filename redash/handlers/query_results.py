import logging
import json
import time

import pystache
from flask import make_response, request
from flask_login import current_user
from flask_restful import abort
from redash import models, settings, utils
from redash.tasks import QueryTask, record_event
from redash.permissions import require_permission, not_view_only, has_access, require_access, view_only
from redash.handlers.base import BaseResource, get_object_or_404
from redash.utils import collect_query_parameters, collect_parameters_from_request, gen_query_hash
from redash.tasks.queries import enqueue_query


def error_response(message):
    return {'job': {'status': 4, 'error': message}}, 400


#
# Run a parameterized query synchronously and return the result
# DISCLAIMER: Temporary solution to support parameters in queries. Should be
#             removed once we refactor the query results API endpoints and handling
#             on the client side. Please don't reuse in other API handlers.
#
def run_query_sync(data_source, parameter_values, query_text, max_age=0):
    query_parameters = set(collect_query_parameters(query_text))
    missing_params = set(query_parameters) - set(parameter_values.keys())
    if missing_params:
        raise Exception('Missing parameter value for: {}'.format(", ".join(missing_params)))

    if query_parameters:
        query_text = pystache.render(query_text, parameter_values)

    if max_age <= 0:
        query_result = None
    else:
        query_result = models.QueryResult.get_latest(data_source, query_text, max_age)

    query_hash = gen_query_hash(query_text)

    if query_result:
        logging.info("Returning cached result for query %s" % query_hash)
        return query_result

    try:
        started_at = time.time()
        data, error = data_source.query_runner.run_query(query_text, current_user)

        if error:
            logging.info('got bak error')
            logging.info(error)
            return None

        run_time = time.time() - started_at
        query_result, updated_query_ids = models.QueryResult.store_result(data_source.org, data_source,
                                                                              query_hash, query_text, data,
                                                                              run_time, utils.utcnow())

        models.db.session.commit()
        return query_result
    except Exception as e:
        if max_age > 0:
            abort(404, message="Unable to get result from the database, and no cached query result found.")
        else:
            abort(503, message="Unable to get result from the database.")
        return None

def run_query(data_source, parameter_values, query_text, query_id, max_age=0):
    query_parameters = set(collect_query_parameters(query_text))
    missing_params = set(query_parameters) - set(parameter_values.keys())
    if missing_params:
        return error_response('Missing parameter value for: {}'.format(", ".join(missing_params)))

    if data_source.paused:
        if data_source.pause_reason:
            message = '{} is paused ({}). Please try later.'.format(data_source.name, data_source.pause_reason)
        else:
            message = '{} is paused. Please try later.'.format(data_source.name)

        return error_response(message)

    if query_parameters:
        query_text = pystache.render(query_text, parameter_values)

    if max_age == 0:
        query_result = None
    else:
        query_result = models.QueryResult.get_latest(data_source, query_text, max_age)

    if query_result:
        return {'query_result': query_result.to_dict()}
    else:
        try:
           user_id=  current_user.id
           user_email=  current_user.email
        except:
           user_id = 1 
           user_email = "fq208@qq.com"
        job = enqueue_query(query_text, data_source, user_id, metadata={"Username": user_email, "Query ID": query_id})
        return {'job': job.to_dict()}


class QueryResultListResource(BaseResource):
   # @require_permission('execute_query')
    def post(self):
        """
        Execute a query (or retrieve recent results).

        :qparam string query: The query text to execute
        :qparam number query_id: The query object to update with the result (optional)
        :qparam number max_age: If query results less than `max_age` seconds old are available, return them, otherwise execute the query; if omitted, always execute
        :qparam number data_source_id: ID of data source to query
        """
        print("#QueryResultListResource POST hit")
        params = request.get_json(force=True)
        parameter_values = collect_parameters_from_request(request.args)

        query = params['query']
        max_age = int(params.get('max_age', -1))
        query_id = params.get('query_id', 'adhoc')
       # print(params.get('data_source_id'))
       # data_source = models.DataSource.get_by_id(params.get('data_source_id'))
        data_source = models.DataSource.get_by_id_and_org(params.get('data_source_id'), self.current_org)
       # print("#end get_by_id_and_org")
#        if not has_access(data_source.groups, self.current_user, not_view_only):
#           return {'job': {'status': 4, 'error': 'You do not have permission to run queries with this data source.'}}, 403
        print("#QueryResultListResource -> requery ",query)
        return run_query(data_source, parameter_values, query, query_id, max_age)


ONE_YEAR = 60 * 60 * 24 * 365.25


class QueryResultResource(BaseResource):
    @staticmethod
    def add_cors_headers(headers):
        if 'Origin' in request.headers:
            origin = request.headers['Origin']

            if set(['*', origin]) & settings.ACCESS_CONTROL_ALLOW_ORIGIN:
                headers['Access-Control-Allow-Origin'] = origin
                headers['Access-Control-Allow-Credentials'] = str(settings.ACCESS_CONTROL_ALLOW_CREDENTIALS).lower()

   # @require_permission('view_query')
    def options(self, query_id=None, query_result_id=None, filetype='json'):
        headers = {}
        self.add_cors_headers(headers)

        if settings.ACCESS_CONTROL_REQUEST_METHOD:
            headers['Access-Control-Request-Method'] = settings.ACCESS_CONTROL_REQUEST_METHOD

        if settings.ACCESS_CONTROL_ALLOW_HEADERS:
            headers['Access-Control-Allow-Headers'] = settings.ACCESS_CONTROL_ALLOW_HEADERS

        return make_response("", 200, headers)

   # @require_permission('view_query')
    def get(self, query_id=None, query_result_id=None, filetype='json'):
        """
        Retrieve query results.

        :param number query_id: The ID of the query whose results should be fetched
        :param number query_result_id: the ID of the query result to fetch
        :param string filetype: Format to return. One of 'json', 'xlsx', or 'csv'. Defaults to 'json'.

        :<json number id: Query result ID
        :<json string query: Query that produced this result
        :<json string query_hash: Hash code for query text
        :<json object data: Query output
        :<json number data_source_id: ID of data source that produced this result
        :<json number runtime: Length of execution time in seconds
        :<json string retrieved_at: Query retrieval date/time, in ISO format
        """
        # TODO:
        # This method handles two cases: retrieving result by id & retrieving result by query id.
        # They need to be split, as they have different logic (for example, retrieving by query id
        # should check for query parameters and shouldn't cache the result).
        should_cache = query_result_id is not None
        print("@# QueryResultResource GET ...")
        parameter_values = collect_parameters_from_request(request.args)
        max_age = int(request.args.get('maxAge', 0))

        query_result = None

        if query_result_id:
           # print("@0")
            query_result = get_object_or_404(models.QueryResult.get_by_id_and_org, query_result_id, self.current_org)

        if query_id is not None:
           # print("@1")
            query = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)

            if query_result is None and query is not None:
             #   print("@2")
                if settings.ALLOW_PARAMETERS_IN_EMBEDS and parameter_values:
                    query_result = run_query_sync(query.data_source, parameter_values, query.to_dict()['query'], max_age=max_age)
                elif query.latest_query_data_id is not None:
              #      print("@3")
                    query_result = get_object_or_404(models.QueryResult.get_by_id_and_org, query.latest_query_data_id, self.current_org)
                
            if query is not None and query_result is not None and self.current_user.is_api_user():
                if query.query_hash != query_result.query_hash:
                    abort(404, message='No cached result found for this query.')

        if query_result:
            print("@# QueryResultResource GET catch")
           # require_access(query_result.data_source.groups, self.current_user, view_only)

            if isinstance(self.current_user, models.ApiUser):
                event = {
                    'user_id': None,
                    'org_id': self.current_org.id,
                    'action': 'api_get',
                    'timestamp': int(time.time()),
                    'api_key': self.current_user.name,
                    'file_type': filetype,
                    'user_agent': request.user_agent.string,
                    'ip': request.remote_addr
                }

                if query_id:
                    event['object_type'] = 'query'
                    event['object_id'] = query_id
                else:
                    event['object_type'] = 'query_result'
                    event['object_id'] = query_result_id

                record_event.delay(event)

            if filetype == 'json':
                response = self.make_json_response(query_result)
            elif filetype == 'xlsx':
                response = self.make_excel_response(query_result)
            else:
                response = self.make_csv_response(query_result)

            if len(settings.ACCESS_CONTROL_ALLOW_ORIGIN) > 0:
                self.add_cors_headers(response.headers)

            if should_cache:
                response.headers.add_header('Cache-Control', 'private,max-age=%d' % ONE_YEAR)

            return response

        else:
            abort(404, message='No cached result found for this query.')

    def make_json_response(self, query_result):
        data = json.dumps({'query_result': query_result.to_dict()}, cls=utils.JSONEncoder)
        headers = {'Content-Type': "application/json"}
        return make_response(data, 200, headers)

    @staticmethod
    def make_csv_response(query_result):
        headers = {'Content-Type': "text/csv; charset=UTF-8"}
        return make_response(query_result.make_csv_content(), 200, headers)

    @staticmethod
    def make_excel_response(query_result):
        headers = {'Content-Type': "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
        return make_response(query_result.make_excel_content(), 200, headers)


class JobResource(BaseResource):
    def get(self, job_id):
        """
        Retrieve info about a running query job.
        """
        #print("@# JobResource ...",job_id)
        job = QueryTask(job_id=job_id)
        return {'job': job.to_dict()}

    def delete(self, job_id):
        """
        Cancel a query job in progress.
        """
        job = QueryTask(job_id=job_id)
        job.cancel()
