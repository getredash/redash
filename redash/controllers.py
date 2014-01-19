"""
Flask-restful based API implementation for re:dash.

Currently the Flask server is used to serve the static assets (and the Angular.js app),
but this is only due to configuration issues and temporary.
"""
import csv
import hashlib
import json
import numbers
import cStringIO
import datetime
import dateutil.parser

from flask import g, render_template, send_from_directory, make_response, request, jsonify
from flask.ext.restful import Resource, abort

import sqlparse
from redash import settings
from redash.data import utils
from redash import data

from redash import app, auth, api, redis_connection, data_manager


@app.route('/ping', methods=['GET'])
def ping():
    return 'PONG.'


@app.route('/admin/<anything>')
@app.route('/dashboard/<anything>')
@app.route('/queries/<anything>')
@app.route('/')
@auth.required
def index(anything=None):
    email_md5 = hashlib.md5(g.user['email'].lower()).hexdigest()
    gravatar_url = "https://www.gravatar.com/avatar/%s?s=40" % email_md5

    user = {
        'gravatar_url': gravatar_url,
        'is_admin': g.user['email'] in settings.ADMINS,
        'name': g.user['email']
    }

    return render_template("index.html", user=json.dumps(user), analytics=settings.ANALYTICS)


@app.route('/status.json')
@auth.required
def status_api():
    status = {}
    info = redis_connection.info()
    status['redis_used_memory'] = info['used_memory_human']

    status['queries_count'] = data.models.Query.objects.count()
    status['query_results_count'] = data.models.QueryResult.objects.count()
    status['dashboards_count'] = data.models.Dashboard.objects.count()
    status['widgets_count'] = data.models.Widget.objects.count()

    status['workers'] = [redis_connection.hgetall(w)
                         for w in redis_connection.smembers('workers')]

    manager_status = redis_connection.hgetall('manager:status')
    status['manager'] = manager_status
    status['manager']['queue_size'] = redis_connection.zcard('jobs')

    return jsonify(status)


@app.route('/api/queries/format', methods=['POST'])
@auth.required
def format_sql_query(self):
    arguments = json.loads(self.request.body)
    query = arguments.get("query", "")

    return sqlparse.format(query, reindent=True, keyword_case='upper')


class BaseResource(Resource):
    decorators = [auth.required]

    @property
    def current_user(self):
        return g.user['email']


class DashboardListAPI(BaseResource):
    def get(self):
        dashboards = [d.to_dict() for d in
                      data.models.Dashboard.objects.filter(is_archived=False)]

        return dashboards

    def post(self):
        dashboard_properties = json.loads(self.request.body)
        dashboard = data.models.Dashboard(name=dashboard_properties['name'],
                                          user=self.current_user,
                                          layout='[]')
        dashboard.save()
        return dashboard.to_dict()


class DashboardAPI(BaseResource):
    def get(self, dashboard_slug=None):
        dashboard = data.models.Dashboard.objects.prefetch_related('widgets__query__latest_query_data').get(slug=dashboard_slug)
        return dashboard.to_dict(with_widgets=True)

    def post(self, dashboard_id):
        dashboard_properties = request.json
        dashboard = data.models.Dashboard.objects.get(pk=dashboard_id)
        dashboard.layout = dashboard_properties['layout']
        dashboard.name = dashboard_properties['name']
        dashboard.save()

        return dashboard.to_dict(with_widgets=True)

    def delete(self, dashboard_slug):
        dashboard = data.models.Dashboard.objects.get(slug=dashboard_slug)
        dashboard.is_archived = True
        dashboard.save()

api.add_resource(DashboardListAPI, '/api/dashboards', endpoint='dashboards')
api.add_resource(DashboardAPI, '/api/dashboards/<dashboard_slug>', endpoint='dashboard')


class WidgetListAPI(BaseResource):
    def post(self):
        widget_properties = request.json
        widget_properties['options'] = json.dumps(widget_properties['options'])
        widget = data.models.Widget(**widget_properties)
        widget.save()

        layout = json.loads(widget.dashboard.layout)
        new_row = True

        if len(layout) == 0 or widget.width == 2:
            layout.append([widget.id])
        elif len(layout[-1]) == 1:
            neighbour_widget = data.models.Widget.objects.get(pk=layout[-1][0])
            if neighbour_widget.width == 1:
                layout[-1].append(widget.id)
                new_row = False
            else:
                layout.append([widget.id])
        else:
            layout.append([widget.id])

        widget.dashboard.layout = json.dumps(layout)
        widget.dashboard.save()

        return {'widget': widget.to_dict(), 'layout': layout, 'new_row': new_row}


class WidgetAPI(BaseResource):
    def delete(self, widget_id):
        widget = data.models.Widget.objects.get(pk=widget_id)
        # TODO: reposition existing ones
        layout = json.loads(widget.dashboard.layout)
        layout = map(lambda row: filter(lambda w: w != widget_id, row), layout)
        layout = filter(lambda row: len(row) > 0, layout)
        widget.dashboard.layout = json.dumps(layout)
        widget.dashboard.save()

        widget.delete()

api.add_resource(WidgetListAPI, '/api/widgets', endpoint='widgets')
api.add_resource(WidgetAPI, '/api/widgets/<int:widget_id>', endpoint='widget')


class QueryListAPI(BaseResource):
    def post(self):
        query_def = request.json
        if 'created_at' in query_def:
            query_def['created_at'] = dateutil.parser.parse(query_def['created_at'])

        query_def.pop('latest_query_data', None)

        query_def['user'] = self.current_user
        query = data.models.Query(**query_def)
        query.save()

        return query.to_dict(with_result=False)

    def get(self):
        return [q.to_dict(with_result=False, with_stats=True) for q in data.models.Query.all_queries()]


class QueryAPI(BaseResource):
    def post(self, query_id):
        query_def = request.json
        if 'created_at' in query_def:
            query_def['created_at'] = dateutil.parser.parse(query_def['created_at'])

        query_def.pop('latest_query_data', None)

        query = data.models.Query(**query_def)
        fields = query_def.keys()
        fields.remove('id')
        query.save(update_fields=fields)

        return query.to_dict(with_result=False)

    def get(self, query_id):
        q = data.models.Query.objects.get(pk=query_id)
        if q:
            return q.to_dict()
        else:
            abort(404, message="Query not found.")

api.add_resource(QueryListAPI, '/api/queries', endpoint='queries')
api.add_resource(QueryAPI, '/api/queries/<query_id>', endpoint='query')


class QueryResultListAPI(BaseResource):
    def post(self):
        params = request.json

        if params['ttl'] == 0:
            query_result = None
        else:
            query_result = data_manager.get_query_result(params['query'], int(params['ttl']))

        if query_result:
            return {'query_result': query_result.to_dict(parse_data=True)}
        else:
            job = data_manager.add_job(params['query'], data.Job.HIGH_PRIORITY)
            return {'job': job.to_dict()}


class QueryResultAPI(BaseResource):
    def get(self, query_result_id):
        query_result = data_manager.get_query_result_by_id(query_result_id)
        if query_result:
            return {'query_result': query_result.to_dict(parse_data=True)}
        else:
            abort(404)


class CsvQueryResultsAPI(BaseResource):
    # TODO: bring this functionality:
    #def get_current_user(self):
    #    user = super(CsvQueryResultsHandler, self).get_current_user()
    #    if not user:
    #        api_key = self.get_argument("api_key", None)
    #        query = data.models.Query.objects.get(pk=self.path_args[0])
    #
    #        if query.api_key and query.api_key == api_key:
    #            user = "API-Key=%s" % api_key
    #
    #    return user

    def get(self, query_id, query_result_id=None):
        if not query_result_id:
            query = data.models.Query.objects.get(pk=query_id)
            if query:
                query_result_id = query.latest_query_data_id

        query_result = query_result_id and data_manager.get_query_result_by_id(query_result_id)
        if query_result:
            s = cStringIO.StringIO()

            query_data = json.loads(query_result.data)
            writer = csv.DictWriter(s, fieldnames=[col['name'] for col in query_data['columns']])
            writer.writer = utils.UnicodeWriter(s)
            writer.writeheader()
            for row in query_data['rows']:
                for k, v in row.iteritems():
                    if isinstance(v, numbers.Number) and (v > 1000 * 1000 * 1000 * 100):
                        row[k] = datetime.datetime.fromtimestamp(v/1000.0)

                writer.writerow(row)

            return make_response(s.getvalue(), 200, {'Content-Type': "text/csv; charset=UTF-8"})
        else:
            abort(404)

api.add_resource(CsvQueryResultsAPI, '/api/queries/<query_id>/results/<query_result_id>.csv',
                 '/api/queries/<query_id>/results.csv',
                 endpoint='csv_query_results')
api.add_resource(QueryResultListAPI, '/api/query_results', endpoint='query_results')
api.add_resource(QueryResultAPI, '/api/query_results/<query_result_id>', endpoint='query_result')


class JobAPI(BaseResource):
    def get(self, job_id):
        # TODO: if finished, include the query result
        job = data.Job.load(data_manager.redis_connection, job_id)
        return {'job': job.to_dict()}

    def delete(self, job_id):
        job = data.Job.load(data_manager.redis_connection, job_id)
        job.cancel()

api.add_resource(JobAPI, '/api/jobs/<job_id>', endpoint='job')

@app.route('/<path:filename>')
@auth.required
def send_static(filename):
    return send_from_directory(settings.STATIC_ASSETS_PATH, filename)


if __name__ == '__main__':
    app.run(debug=True)



