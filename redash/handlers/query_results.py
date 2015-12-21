import csv
import json
import cStringIO
import time
import logging

from flask import make_response, request
from flask.ext.restful import abort
from flask_login import current_user

from redash import models, settings, utils
from redash.wsgi import api
from redash.tasks import QueryTask, record_event
from redash.permissions import require_permission
from redash.handlers.base import BaseResource


class QueryResultListAPI(BaseResource):
    @require_permission('execute_query')
    def post(self):
        params = request.get_json(force=True)

        if settings.FEATURE_TABLES_PERMISSIONS:
            metadata = utils.SQLMetaData(params['query'])

            if metadata.has_non_select_dml_statements or metadata.has_ddl_statements:
                return {
                    'job': {
                        'error': 'Only SELECT statements are allowed'
                    }
                }

            if len(metadata.used_tables - current_user.allowed_tables) > 0 and '*' not in current_user.allowed_tables:
                logging.warning('Permission denied for user %s to table %s', self.current_user.name, metadata.used_tables)
                return {
                    'job': {
                        'error': 'Access denied for table(s): %s' % (metadata.used_tables)
                    }
                }

        models.ActivityLog(
            user=self.current_user,
            type=models.ActivityLog.QUERY_EXECUTION,
            activity=params['query']
        ).save()

        max_age = int(params.get('max_age', -1))

        if max_age == 0:
            query_result = None
        else:
            query_result = models.QueryResult.get_latest(params['data_source_id'], params['query'], max_age)

        if query_result:
            return {'query_result': query_result.to_dict()}
        else:
            data_source = models.DataSource.get_by_id(params['data_source_id'])
            query_id = params.get('query_id', 'adhoc')
            job = QueryTask.add_task(params['query'], data_source, metadata={"Username": self.current_user.name, "Query ID": query_id})
            return {'job': job.to_dict()}


ONE_YEAR = 60 * 60 * 24 * 365.25


class QueryResultAPI(BaseResource):

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
        should_cache = query_result_id is not None
        if query_result_id is None and query_id is not None:
            query = models.Query.get(models.Query.id == query_id)
            if query:
                query_result_id = query._data['latest_query_data']

        if query_result_id:
            query_result = models.QueryResult.get_by_id(query_result_id)

        if query_result:
            if isinstance(self.current_user, models.ApiUser):
                event = {
                    'user_id': None,
                    'action': 'api_get',
                    'timestamp': int(time.time()),
                    'api_key': self.current_user.id,
                    'file_type': filetype
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
            else:
                response = self.make_csv_response(query_result)

            if len(settings.ACCESS_CONTROL_ALLOW_ORIGIN) > 0:
                self.add_cors_headers(response.headers)

            if should_cache:
                response.headers.add_header('Cache-Control', 'max-age=%d' % ONE_YEAR)

            return response

        else:
            abort(404)

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


api.add_resource(QueryResultListAPI, '/api/query_results', endpoint='query_results')
api.add_resource(QueryResultAPI,
                 '/api/query_results/<query_result_id>',
                 '/api/queries/<query_id>/results.<filetype>',
                 '/api/queries/<query_id>/results/<query_result_id>.<filetype>',
                 endpoint='query_result')


class JobAPI(BaseResource):
    def get(self, job_id):
        # TODO: if finished, include the query result
        job = QueryTask(job_id=job_id)
        return {'job': job.to_dict()}

    def delete(self, job_id):
        job = QueryTask(job_id=job_id)
        job.cancel()

api.add_resource(JobAPI, '/api/jobs/<job_id>', endpoint='job')
