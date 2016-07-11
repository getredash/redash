import csv
import json
import cStringIO
import time

import pystache
from flask import make_response, request
from flask_login import current_user
from flask_restful import abort
import xlsxwriter
from redash import models, settings, utils
from redash.tasks import QueryTask, record_event
from redash.permissions import require_permission, not_view_only, has_access, require_access, view_only
from redash.handlers.base import BaseResource, get_object_or_404
from redash.utils import collect_query_parameters, collect_parameters_from_request
from redash.tasks.queries import enqueue_query


def error_response(message):
    return {'job': {'status': 4, 'error': message}}, 400


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
        job = enqueue_query(query_text, data_source, metadata={"Username": current_user.name, "Query ID": query_id})
        return {'job': job.to_dict()}


class QueryResultListResource(BaseResource):
    @require_permission('execute_query')
    def post(self):
        params = request.get_json(force=True)
        parameter_values = collect_parameters_from_request(request.args)

        query = params['query']
        max_age = int(params.get('max_age', -1))
        query_id = params.get('query_id', 'adhoc')

        data_source = models.DataSource.get_by_id_and_org(params.get('data_source_id'), self.current_org)

        if not has_access(data_source.groups, self.current_user, not_view_only):
            return {'job': {'status': 4, 'error': 'You do not have permission to run queries with this data source.'}}, 403

        self.record_event({
            'action': 'execute_query',
            'timestamp': int(time.time()),
            'object_id': data_source.id,
            'object_type': 'data_source',
            'query': query
        })

        return run_query(data_source, parameter_values, query, query_id, max_age)


ONE_YEAR = 60 * 60 * 24 * 365.25


class QueryResultResource(BaseResource):
    @staticmethod
    def add_cors_headers(headers):
        if 'Origin' in request.headers:
            origin = request.headers['Origin']

            if origin in settings.ACCESS_CONTROL_ALLOW_ORIGIN:
                headers['Access-Control-Allow-Origin'] = origin
                headers['Access-Control-Allow-Credentials'] = str(settings.ACCESS_CONTROL_ALLOW_CREDENTIALS).lower()

    @require_permission('view_query')
    def options(self, query_id=None, query_result_id=None, filetype='json'):
        headers = {}
        self.add_cors_headers(headers)

        if settings.ACCESS_CONTROL_REQUEST_METHOD:
            headers['Access-Control-Request-Method'] = settings.ACCESS_CONTROL_REQUEST_METHOD

        if settings.ACCESS_CONTROL_ALLOW_HEADERS:
            headers['Access-Control-Allow-Headers'] = settings.ACCESS_CONTROL_ALLOW_HEADERS

        return make_response("", 200, headers)

    @require_permission('view_query')
    def get(self, query_id=None, query_result_id=None, filetype='json'):
        # TODO:
        # This method handles two cases: retrieving result by id & retrieving result by query id.
        # They need to be split, as they have different logic (for example, retrieving by query id
        # should check for query parameters and shouldn't cache the result).
        should_cache = query_result_id is not None
        if query_result_id is None and query_id is not None:
            query = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)
            if query:
                query_result_id = query._data['latest_query_data']

        if query_result_id:
            query_result = get_object_or_404(models.QueryResult.get_by_id_and_org, query_result_id, self.current_org)
        else:
            query_result = None

        if query_result:
            require_access(query_result.data_source.groups, self.current_user, view_only)

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
                response.headers.add_header('Cache-Control', 'max-age=%d' % ONE_YEAR)

            return response

        else:
            abort(404, message='No cached result found for this query.')

    def make_json_response(self, query_result):
        data = json.dumps({'query_result': query_result.to_dict()}, cls=utils.JSONEncoder)
        return make_response(data, 200, {})

    @staticmethod
    def make_csv_response(query_result):
        s = cStringIO.StringIO()

        query_data = json.loads(query_result.data)
        writer = csv.DictWriter(s, fieldnames=[col['name'] for col in query_data['columns']])
        writer.writer = utils.UnicodeWriter(s)
        writer.writeheader()
        for row in query_data['rows']:
            writer.writerow(row)

        headers = {'Content-Type': "text/csv; charset=UTF-8"}
        return make_response(s.getvalue(), 200, headers)

    @staticmethod
    def make_excel_response(query_result):
        s = cStringIO.StringIO()

        query_data = json.loads(query_result.data)
        book = xlsxwriter.Workbook(s)
        sheet = book.add_worksheet("result")

        column_names = []
        for (c, col) in enumerate(query_data['columns']):
            sheet.write(0, c, col['name'])
            column_names.append(col['name'])

        for (r, row) in enumerate(query_data['rows']):
            for (c, name) in enumerate(column_names):
                sheet.write(r + 1, c, row.get(name))

        book.close()

        headers = {'Content-Type': "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
        return make_response(s.getvalue(), 200, headers)


class JobResource(BaseResource):
    def get(self, job_id):
        job = QueryTask(job_id=job_id)
        return {'job': job.to_dict()}

    def delete(self, job_id):
        job = QueryTask(job_id=job_id)
        job.cancel()

