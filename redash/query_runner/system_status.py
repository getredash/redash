import logging
import sqlite3
import itertools
from datetime import datetime

from redash.query_runner import TYPE_STRING, BaseQueryRunner, register
from redash.utils import json_loads, json_dumps

from sqlalchemy import union_all
from redash import redis_connection, __version__, settings
from redash.models import db, DataSource, Query, QueryResult, Dashboard, Widget

logger = logging.getLogger(__name__)


class CreateTableError(Exception):
    pass


class BaseStatusSource(object):
    name = None
    columns = ['name', 'value']

    def get_data(self):
        return []

    def init_data(self, connection):
        table_name = self.name
        column_list = ', '.join(self.columns)
        create_table = u'CREATE TABLE {table_name} ({column_list})'.format(
            table_name=table_name, column_list=column_list)
        try:
            logger.debug('CREATE TABLE query: %s', create_table)
            connection.execute(create_table)
        except sqlite3.OperationalError as exc:
            raise CreateTableError(u'Error creating table {}: {}'.format(table_name, exc.message))

        insert_template = u'INSERT INTO {table_name} ({column_list}) VALUES ({placeholders})'.format(
            table_name=table_name,
            column_list=column_list,
            placeholders=','.join(['?'] * len(self.columns)))

        rows = self.get_data()
        for row in rows:
            values = [unicode(row.get(column)) for column in self.columns]
            connection.execute(insert_template, values)


class SystemStatusSource(BaseStatusSource):
    name = 'system'

    def get_data(self):
        result = dict()

        result['Version'] = __version__

        # counters
        result['Queries Count'] = Query.query.count()
        if settings.FEATURE_SHOW_QUERY_RESULTS_COUNT:
            result['Query Results Count'] = QueryResult.query.count()
            result['Unused Query Results Count'] = QueryResult.unused().count()
        result['Dashboards Count'] = Dashboard.query.count()
        result['Widgets Count'] = Widget.query.count()

        # redis
        info = redis_connection.info()
        result['Redis Used Memory'] = info['used_memory']
        result['Redis Used Memory Human'] = info['used_memory_human']

        return [
            {'name': key, 'value': value}
            for key, value in result.items()
        ]


class ManagerStatusSource(BaseStatusSource):
    name = 'manager'

    def get_data(self):
        result = dict()

        status = redis_connection.hgetall('redash:status')

        def ts2string(value):
            if value is None:
                return ''
            value = float(value)
            return datetime.utcfromtimestamp(value).strftime('%Y-%m-%d %H:%M:%S')

        result['Started'] = ts2string(status.get('started_at'))
        result['Last Refresh'] = ts2string(status.get('last_refresh_at'))
        result['Outdated Queries Count'] = status.get('outdated_queries_count', 0)

        return [
            {'name': key, 'value': value}
            for key, value in result.items()
        ]


class QueuesStatusSource(BaseStatusSource):
    name = 'queues'

    def get_data(self):
        queue_names = db.session.query(DataSource.queue_name).distinct()
        scheduled_queue_names = db.session.query(DataSource.scheduled_queue_name).distinct()
        query = db.session.execute(union_all(queue_names, scheduled_queue_names))

        queues = ['celery'] + [row[0] for row in query]

        result = dict()

        for queue in queues:
            result[queue] = redis_connection.llen(queue)

        return [
            {'name': key, 'value': value}
            for key, value in result.items()
        ]


class DatabaseStatusSource(BaseStatusSource):
    name = 'database'

    def get_data(self):
        result = dict()
        queries = [
            ['Query Results Size', "select pg_total_relation_size('query_results') as size from (select 1) as a"],
            ['Redash DB Size', "select pg_database_size('postgres') as size"]
        ]
        for query_name, query in queries:
            row = db.session.execute(query).first()
            result[query_name] = row[0]

        return [
            {'name': key, 'value': value}
            for key, value in result.items()
        ]


class CeleryWorkersStatusSource(BaseStatusSource):
    name = 'celery_workers'
    columns = ['state', 'task_name', 'worker', 'queue', 'task_id', 'worker_pid', 'start_time']

    def parse_tasks(self, task_lists, state):
        rows = []

        for task in itertools.chain(*task_lists.values()):
            task_row = {
                'state': state,
                'task_name': task['name'],
                'worker': task['hostname'],
                'queue': task['delivery_info']['routing_key'],
                'task_id': task['id'],
                'worker_pid': task['worker_pid'],
                'start_time': task['time_start'],
            }

            if task['name'] == 'redash.tasks.execute_query':
                try:
                    args = json_loads(task['args'])
                except ValueError:
                    args = {}

                if args.get('query_id') == 'adhoc':
                    args['query_id'] = None

                task_row.update(args)

            rows.append(task_row)

        return rows

    def get_data(self):
        from redash.worker import celery
        result = self.parse_tasks(celery.control.inspect().active(), 'active')
        result += self.parse_tasks(celery.control.inspect().reserved(), 'reserved')
        return result


class SystemStatus(BaseQueryRunner):
    sources = [
        SystemStatusSource(),
        ManagerStatusSource(),
        QueuesStatusSource(),
        DatabaseStatusSource(),
        CeleryWorkersStatusSource(),
    ]

    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {}
        }

    @classmethod
    def annotate_query(cls):
        return False

    @classmethod
    def name(cls):
        return 'System Status'

    @classmethod
    def type(cls):
        return 'system_status'

    def test_connection(self):
        pass

    def get_schema(self, get_stats=False):
        return [
            {'name': source.name, 'columns': source.columns}
            for source in self.sources
        ]

    def run_query(self, query, user):
        connection = sqlite3.connect(':memory:')

        for source in self.sources:
            source.init_data(connection)

        cursor = connection.cursor()
        try:
            cursor.execute(query)

            if cursor.description is not None:
                columns = self.fetch_columns([(i[0], TYPE_STRING) for i in cursor.description])
                column_names = [c['name'] for c in columns]

                rows = []
                for i, row in enumerate(cursor):
                    rows.append(dict(zip(column_names, row)))

                data = {'columns': columns, 'rows': rows}
                error = None
                json_data = json_dumps(data)
            else:
                error = 'Query completed but it returned no data.'
                json_data = None
        except KeyboardInterrupt:
            connection.cancel()
            error = 'Query cancelled by user.'
            json_data = None
        finally:
            connection.close()
        return json_data, error


register(SystemStatus)
