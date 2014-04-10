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

from flask import render_template, send_from_directory, make_response, request, jsonify, redirect, \
    session, url_for
from flask.ext.restful import Resource, abort
from flask_login import current_user, login_user, logout_user

import sqlparse
from permissions import require_permission
from redash import settings, utils
from redash import data

from redash import app, auth, api, redis_connection, data_manager
from redash import models


@app.route('/ping', methods=['GET'])
def ping():
    return 'PONG.'


@app.route('/admin/<anything>')
@app.route('/dashboard/<anything>')
@app.route('/queries')
@app.route('/queries/<query_id>')
@app.route('/queries/<query_id>/<anything>')
@app.route('/')
@auth.required
def index(**kwargs):
    email_md5 = hashlib.md5(current_user.email.lower()).hexdigest()
    gravatar_url = "https://www.gravatar.com/avatar/%s?s=40" % email_md5

    user = {
        'gravatar_url': gravatar_url,
        'is_admin': current_user.is_admin,
        'id': current_user.id,
        'name': current_user.name,
        'email': current_user.email,
        'permissions': current_user.permissions
    }

    return render_template("index.html", user=json.dumps(user), name=settings.NAME,
                           analytics=settings.ANALYTICS)


@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated():
        return redirect(request.args.get('next') or '/')

    if not settings.PASSWORD_LOGIN_ENABLED:
        blueprint = app.extensions['googleauth'].blueprint
        return redirect(url_for("%s.login" % blueprint.name, next=request.args.get('next')))

    if request.method == 'POST':
        user = models.User.select().where(models.User.email == request.form['username']).first()
        if user and user.verify_password(request.form['password']):
            remember = ('remember' in request.form)
            login_user(user, remember=remember)
            return redirect(request.args.get('next') or '/')

    return render_template("login.html",
                           name=settings.NAME,
                           analytics=settings.ANALYTICS,
                           next=request.args.get('next'),
                           username=request.form.get('username', ''),
                           show_google_openid=settings.GOOGLE_OPENID_ENABLED)


@app.route('/logout')
def logout():
    logout_user()
    session.pop('openid', None)

    return redirect('/login')

@app.route('/status.json')
@auth.required
@require_permission('admin')
def status_api():
    status = {}
    info = redis_connection.info()
    status['redis_used_memory'] = info['used_memory_human']

    status['queries_count'] = models.Query.select().count()
    status['query_results_count'] = models.QueryResult.select().count()
    status['dashboards_count'] = models.Dashboard.select().count()
    status['widgets_count'] = models.Widget.select().count()

    status['workers'] = [redis_connection.hgetall(w)
                         for w in redis_connection.smembers('workers')]

    manager_status = redis_connection.hgetall('manager:status')
    status['manager'] = manager_status
    status['manager']['queue_size'] = redis_connection.zcard('jobs')

    return jsonify(status)


@app.route('/api/queries/format', methods=['POST'])
@auth.required
def format_sql_query():
    arguments = request.get_json(force=True)
    query = arguments.get("query", "")

    return sqlparse.format(query, reindent=True, keyword_case='upper')


class BaseResource(Resource):
    decorators = [auth.required]

    def __init__(self, *args, **kwargs):
        super(BaseResource, self).__init__(*args, **kwargs)
        self._user = None

    @property
    def current_user(self):
        return current_user._get_current_object()


class DataSourceListAPI(BaseResource):
    def get(self):
        data_sources = [ds.to_dict() for ds in models.DataSource.select()]
        return data_sources

api.add_resource(DataSourceListAPI, '/api/data_sources', endpoint='data_sources')


class DashboardListAPI(BaseResource):
    def get(self):
        dashboards = [d.to_dict() for d in
                      models.Dashboard.select().where(models.Dashboard.is_archived==False)]

        return dashboards

    @require_permission('create_dashboard')
    def post(self):
        dashboard_properties = request.get_json(force=True)
        dashboard = models.Dashboard(name=dashboard_properties['name'],
                                     user=self.current_user,
                                     layout='[]')
        dashboard.save()
        return dashboard.to_dict()


class DashboardAPI(BaseResource):
    def get(self, dashboard_slug=None):
        try:
            dashboard = models.Dashboard.get_by_slug(dashboard_slug)
        except models.Dashboard.DoesNotExist:
            abort(404)

        return dashboard.to_dict(with_widgets=True)

    @require_permission('edit_dashboard')
    def post(self, dashboard_slug):
        dashboard_properties = request.get_json(force=True)
        # TODO: either convert all requests to use slugs or ids
        dashboard = models.Dashboard.get_by_id(dashboard_slug)
        dashboard.layout = dashboard_properties['layout']
        dashboard.name = dashboard_properties['name']
        dashboard.save()

        return dashboard.to_dict(with_widgets=True)

    @require_permission('edit_dashboard')
    def delete(self, dashboard_slug):
        dashboard = models.Dashboard.get_by_slug(dashboard_slug)
        dashboard.is_archived = True
        dashboard.save()

api.add_resource(DashboardListAPI, '/api/dashboards', endpoint='dashboards')
api.add_resource(DashboardAPI, '/api/dashboards/<dashboard_slug>', endpoint='dashboard')


class WidgetListAPI(BaseResource):
    @require_permission('edit_dashboard')
    def post(self):
        widget_properties = request.get_json(force=True)
        widget_properties['options'] = json.dumps(widget_properties['options'])
        widget_properties.pop('id', None)
        widget_properties['dashboard'] = widget_properties.pop('dashboard_id')
        widget_properties['visualization'] = widget_properties.pop('visualization_id')
        widget = models.Widget(**widget_properties)
        widget.save()

        layout = json.loads(widget.dashboard.layout)
        new_row = True

        if len(layout) == 0 or widget.width == 2:
            layout.append([widget.id])
        elif len(layout[-1]) == 1:
            neighbour_widget = models.Widget.get(models.Widget.id == layout[-1][0])
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
    @require_permission('edit_dashboard')
    def delete(self, widget_id):
        widget = models.Widget.get(models.Widget.id == widget_id)
        # TODO: reposition existing ones
        layout = json.loads(widget.dashboard.layout)
        layout = map(lambda row: filter(lambda w: w != widget_id, row), layout)
        layout = filter(lambda row: len(row) > 0, layout)
        widget.dashboard.layout = json.dumps(layout)
        widget.dashboard.save()

        widget.delete_instance()

api.add_resource(WidgetListAPI, '/api/widgets', endpoint='widgets')
api.add_resource(WidgetAPI, '/api/widgets/<int:widget_id>', endpoint='widget')


class QueryListAPI(BaseResource):
    @require_permission('create_query')
    def post(self):
        query_def = request.get_json(force=True)
        for field in ['id', 'created_at', 'api_key', 'visualizations', 'latest_query_data']:
            query_def.pop(field, None)

        query_def['user'] = self.current_user
        query_def['data_source'] = query_def.pop('data_source_id')
        query = models.Query(**query_def)
        query.save()

        query.create_default_visualizations()

        return query.to_dict(with_result=False)

    @require_permission('view_query')
    def get(self):
        return [q.to_dict(with_result=False, with_stats=True) for q in models.Query.all_queries()]


class QueryAPI(BaseResource):
    @require_permission('edit_query')
    def post(self, query_id):
        query_def = request.get_json(force=True)
        for field in ['id', 'created_at', 'api_key', 'visualizations', 'latest_query_data', 'user']:
            query_def.pop(field, None)

        if 'latest_query_data_id' in query_def:
            query_def['latest_query_data'] = query_def.pop('latest_query_data_id')

        if 'data_source_id' in query_def:
            query_def['data_source'] = query_def.pop('data_source_id')

        models.Query.update_instance(query_id, **query_def)

        query = models.Query.get_by_id(query_id)

        return query.to_dict(with_result=False, with_visualizations=True)

    @require_permission('view_query')
    def get(self, query_id):
        q = models.Query.get(models.Query.id == query_id)
        if q:
            return q.to_dict(with_visualizations=True)
        else:
            abort(404, message="Query not found.")

api.add_resource(QueryListAPI, '/api/queries', endpoint='queries')
api.add_resource(QueryAPI, '/api/queries/<query_id>', endpoint='query')


class VisualizationListAPI(BaseResource):
    @require_permission('edit_query')
    def post(self):
        kwargs = request.get_json(force=True)
        kwargs['options'] = json.dumps(kwargs['options'])
        kwargs['query'] = kwargs.pop('query_id')

        vis = models.Visualization(**kwargs)
        vis.save()

        return vis.to_dict(with_query=False)


class VisualizationAPI(BaseResource):
    @require_permission('edit_query')
    def post(self, visualization_id):
        kwargs = request.get_json(force=True)
        if 'options' in kwargs:
            kwargs['options'] = json.dumps(kwargs['options'])
        kwargs.pop('id', None)

        update = models.Visualization.update(**kwargs).where(models.Visualization.id == visualization_id)
        update.execute()

        vis = models.Visualization.get_by_id(visualization_id)

        return vis.to_dict(with_query=False)

    @require_permission('edit_query')
    def delete(self, visualization_id):
        vis = models.Visualization.get(models.Visualization.id == visualization_id)
        vis.delete_instance()

api.add_resource(VisualizationListAPI, '/api/visualizations', endpoint='visualizations')
api.add_resource(VisualizationAPI, '/api/visualizations/<visualization_id>', endpoint='visualization')


class QueryResultListAPI(BaseResource):
    @require_permission('execute_query')
    def post(self):
        params = request.json

        models.ActivityLog(
            user=self.current_user,
            type=models.ActivityLog.QUERY_EXECUTION,
            activity=params['query']
        ).save()

        if params['ttl'] == 0:
            query_result = None
        else:
            query_result = models.QueryResult.get_latest(params['data_source_id'], params['query'], int(params['ttl']))

        if query_result:
            return {'query_result': query_result.to_dict()}
        else:
            data_source = models.DataSource.get_by_id(params['data_source_id'])
            job = data_manager.add_job(params['query'], data.Job.HIGH_PRIORITY, data_source)
            return {'job': job.to_dict()}


class QueryResultAPI(BaseResource):
    @require_permission('view_query')
    def get(self, query_result_id):
        query_result = models.QueryResult.get_by_id(query_result_id)
        if query_result:
            return {'query_result': query_result.to_dict()}
        else:
            abort(404)


class CsvQueryResultsAPI(BaseResource):
    @require_permission('view_query')
    def get(self, query_id, query_result_id=None):
        if not query_result_id:
            query = models.Query.get(models.Query.id == query_id)
            if query:
                query_result_id = query._data['latest_query_data']

        query_result = query_result_id and models.QueryResult.get_by_id(query_result_id)
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
def send_static(filename):
    return send_from_directory(settings.STATIC_ASSETS_PATH, filename)


if __name__ == '__main__':
    app.run(debug=True)



