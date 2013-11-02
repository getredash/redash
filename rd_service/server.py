"""
Tornado based API implementation for re:dash.

Also at the moment the Tornado server is used to serve the static assets (and the Angular.js app),
but this is only due to configuration issues and temporary.

Usage:
    python server.py [--port=8888] [--debug] [--static=..]

    port - port to listen to
    debug - enable debug mode (extensive logging, restart on code change)
    static - static assets path

If static option isn't specified it will be taken from settings.py.
"""
import csv
import hashlib
import json
import numbers
import os
import urlparse
import logging
import cStringIO
import datetime
import dateutil.parser
import redis
import sqlparse
import tornado.ioloop
import tornado.web
import tornado.auth
import tornado.options
import settings
from data import utils
import data


class BaseHandler(tornado.web.RequestHandler):
    def initialize(self):
        self.data_manager = self.application.settings.get('data_manager', None)
        self.redis_connection = self.application.settings['redis_connection']

    def get_current_user(self):
        user = self.get_secure_cookie("user")
        return user

    @tornado.web.authenticated
    def prepare(self):
        pass

    def write_json(self, response, encode=True):
        if encode:
            response = json.dumps(response, cls=utils.JSONEncoder)
        self.set_header("Content-Type", "application/json; charset=UTF-8")
        self.write(response)


class PingHandler(tornado.web.RequestHandler):
    def get(self):
        self.write("PONG")


class GoogleLoginHandler(tornado.web.RequestHandler,
                         tornado.auth.GoogleMixin):
    @tornado.web.asynchronous
    @tornado.gen.coroutine
    def get(self):
        if self.get_argument("openid.mode", None):
            user = yield self.get_authenticated_user()

            if user['email'] in settings.ALLOWED_USERS or user['email'].endswith("@%s" % settings.GOOGLE_APPS_DOMAIN):
                logging.info("Authenticated: %s", user['email'])
                self.set_secure_cookie("user", user['email'])
                self.redirect("/")
            else:
                logging.error("Failed logging in with: %s", user)
                self.authenticate_redirect()
        else:
            self.authenticate_redirect()


class MainHandler(BaseHandler):
    def get(self, *args):
        email_md5 = hashlib.md5(self.current_user.lower()).hexdigest()
        gravatar_url = "https://www.gravatar.com/avatar/%s?s=40" % email_md5

        user = {
            'gravatar_url': gravatar_url,
            'is_admin': self.current_user in settings.ADMINS,
            'name': self.current_user
        }

        self.render("index.html", user=json.dumps(user))


class QueryFormatHandler(BaseHandler):
    def post(self):
        arguments = json.loads(self.request.body)
        query = arguments.get("query", "")

        self.write(sqlparse.format(query, reindent=True, keyword_case='upper'))


class StatusHandler(BaseHandler):
    def get(self):
        status = {}
        info = self.redis_connection.info()
        status['redis_used_memory'] = info['used_memory_human']
        status['queries_in_queue'] = self.redis_connection.zcard('jobs')
        status['queries_count'] = data.models.Query.objects.count()
        status['query_results_count'] = data.models.QueryResult.objects.count()
        status['dashboards_count'] = data.models.Dashboard.objects.count()
        status['widgets_count'] = data.models.Widget.objects.count()

        self.write_json(status)


class WidgetsHandler(BaseHandler):
    def post(self, widget_id=None):
        widget_properties = json.loads(self.request.body)
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

        self.write_json({'widget': widget.to_dict(), 'layout': layout, 'new_row': new_row})

    def delete(self, widget_id):
        widget_id = int(widget_id)
        widget = data.models.Widget.objects.get(pk=widget_id)
        # TODO: reposition existing ones
        layout = json.loads(widget.dashboard.layout)
        layout = map(lambda row: filter(lambda w: w != widget_id, row), layout)
        layout = filter(lambda row: len(row) > 0, layout)
        widget.dashboard.layout = json.dumps(layout)
        widget.dashboard.save()

        widget.delete()


class DashboardHandler(BaseHandler):
    def get(self, dashboard_slug=None):
        if dashboard_slug:
            dashboard = data.models.Dashboard.objects.prefetch_related('widgets__query__latest_query_data').get(slug=dashboard_slug)
            self.write_json(dashboard.to_dict(with_widgets=True))
        else:
            dashboards = [d.to_dict() for d in
                          data.models.Dashboard.objects.filter(is_archived=False)]
            self.write_json(dashboards)

    def post(self, dashboard_id):
        if dashboard_id:
            dashboard_properties = json.loads(self.request.body)
            dashboard = data.models.Dashboard.objects.get(pk=dashboard_id)
            dashboard.layout = dashboard_properties['layout']
            dashboard.name = dashboard_properties['name']
            dashboard.save()

            self.write_json(dashboard.to_dict(with_widgets=True))
        else:
            dashboard_properties = json.loads(self.request.body)
            dashboard = data.models.Dashboard(name=dashboard_properties['name'],
                                                    user=self.current_user,
                                                    layout='[]')
            dashboard.save()
            self.write_json(dashboard.to_dict())

    def delete(self, dashboard_slug):
        dashboard = data.models.Dashboard.objects.get(slug=dashboard_slug)
        dashboard.is_archived = True
        dashboard.save()


class QueriesHandler(BaseHandler):
    def post(self, id=None):
        query_def = json.loads(self.request.body)
        if 'created_at' in query_def:
            query_def['created_at'] = dateutil.parser.parse(query_def['created_at'])

        query_def.pop('latest_query_data', None)

        if id:
            query = data.models.Query(**query_def)
            fields = query_def.keys()
            fields.remove('id')
            fields.remove('parent_id')
            query.save(update_fields=fields)
        else:
            query_def['user'] = self.current_user
            query = data.models.Query(**query_def)
            query.save()

        self.write_json(query.to_dict(with_result=False))

    def get(self, id=None):
        if id:
            q = data.models.Query.objects.get(pk=id)
            if q:
                self.write_json(q.to_dict())
            else:
                self.send_error(404)
        else:
            self.write_json([q.to_dict(with_result=False) for q in data.models.Query.objects.all()])


class QueryResultsHandler(BaseHandler):
    def get(self, query_result_id):
        query_result = self.data_manager.get_query_result_by_id(query_result_id)
        if query_result:
            self.write_json({'query_result': query_result.to_dict(parse_data=True)})
        else:
            self.send_error(404)

    def post(self, _):
        params = json.loads(self.request.body)

        if params['ttl'] == 0:
            query_result = None
        else:
            query_result = self.data_manager.get_query_result(params['query'], int(params['ttl']))

        if query_result:
            self.write_json({'query_result': query_result.to_dict(parse_data=True)})
        else:
            job = self.data_manager.add_job(params['query'], data.Job.HIGH_PRIORITY)
            self.write({'job': job.to_dict()})


class JobsHandler(BaseHandler):
    def get(self, job_id=None):
        if job_id:
            # TODO: if finished, include the query result
            job = data.Job.load(self.data_manager, job_id)
            self.write({'job': job.to_dict()})
        else:
            raise NotImplemented

    def delete(self, job_id):
        raise NotImplemented


class CsvQueryResultsHandler(BaseHandler):
    def get(self, query_result_id):
        query_result = self.data_manager.get_query_result_by_id(query_result_id)
        if query_result:
            self.set_header("Content-Type", "text/csv; charset=UTF-8")
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

            self.write(s.getvalue())
        else:
            self.send_error(404)


def get_application(static_path, is_debug, redis_connection, data_manager):
    return tornado.web.Application([(r"/", MainHandler),
                                    (r"/ping", PingHandler),
                                    (r"/api/queries/format", QueryFormatHandler),
                                    (r"/api/queries(?:/([0-9]*))?", QueriesHandler),
                                    (r"/api/query_results(?:/([0-9]*))?", QueryResultsHandler),
                                    (r"/api/query_results/(.*?).csv", CsvQueryResultsHandler),
                                    (r"/api/jobs/(.*)", JobsHandler),
                                    (r"/api/widgets(?:/([0-9]*))?", WidgetsHandler),
                                    (r"/api/dashboards(?:/(.*))?", DashboardHandler),
                                    (r"/admin/(.*)", MainHandler),
                                    (r"/dashboard/(.*)", MainHandler),
                                    (r"/queries(.*)", MainHandler),
                                    (r"/login", GoogleLoginHandler),
                                    (r"/status.json", StatusHandler),
                                    (r"/(.*)", tornado.web.StaticFileHandler,
                                     {"path": static_path})],
                                   template_path=static_path,
                                   static_path=static_path,
                                   debug=is_debug,
                                   login_url="/login",
                                   cookie_secret=settings.COOKIE_SECRET,
                                   redis_connection=redis_connection,
                                   data_manager=data_manager)


if __name__ == '__main__':
    tornado.options.define("port", default=8888, type=int)
    tornado.options.define("debug", default=False, type=bool)
    tornado.options.define("static", default=settings.STATIC_ASSETS_PATH, type=str)

    tornado.options.parse_command_line()

    root_path = os.path.dirname(__file__)
    static_path = os.path.abspath(os.path.join(root_path, tornado.options.options.static))

    url = urlparse.urlparse(settings.REDIS_URL)
    redis_connection = redis.StrictRedis(host=url.hostname, port=url.port, db=0, password=url.password)
    data_manager = data.Manager(redis_connection, settings.INTERNAL_DB_CONNECTION_STRING,
                                      settings.MAX_CONNECTIONS)

    logging.info("re:dash web server stating on port: %d...", tornado.options.options.port)
    logging.info("UI assets path: %s...", static_path)

    application = get_application(static_path, tornado.options.options.debug,
                                  redis_connection, data_manager)

    application.listen(tornado.options.options.port)
    tornado.ioloop.IOLoop.instance().start()