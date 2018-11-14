import logging
import re

import requests

from redash.query_runner import *
from redash.utils import json_dumps, json_loads

logger = logging.getLogger(__name__)


class ClickHouse(BaseSQLQueryRunner):
    noop_query = "SELECT 1"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "default": "http://127.0.0.1:8123"
                },
                "user": {
                    "type": "string",
                    "default": "default"
                },
                "password": {
                    "type": "string"
                },
                "dbname": {
                    "type": "string",
                    "title": "Database Name"
                },
                "timeout": {
                    "type": "number",
                    "title": "Request Timeout",
                    "default": 30
                },
                # comma-separated list of databases excluded from tables view
                "db_excluded": {
                    "type": "string",
                    "title": "Excluded Databases",
                    "default": "system"
                }
            },
            "required": ["dbname"],
            "secret": ["password"]
        }

    @classmethod
    def type(cls):
        return "clickhouse"

    def _get_tables(self, schema):

        excluded_dbs = [str(s.strip()) for s in self.configuration['db_excluded'].split(',')]
        excluded_dbs = tuple(excluded_dbs)

        condition = ''
        if excluded_dbs:
            condition = "WHERE database {condition}"
            if len(excluded_dbs) == 1:
                condition = condition.format(condition="!= '{0}'".format(excluded_dbs[0]))
            else:
                condition = condition.format(condition="NOT IN {0}".format(excluded_dbs))

        query = "SELECT database, table, name FROM system.columns {condition}".format(condition=condition)

        results, error = self.run_query(query, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json_loads(results)

        for row in results['rows']:
            table_name = '{}.{}'.format(row['database'], row['table'])

            if table_name not in schema:
                schema[table_name] = {'name': table_name, 'columns': []}

            schema[table_name]['columns'].append(row['name'])

        return schema.values()

    def _send_query(self, data, stream=False):
        r = requests.post(
            self.configuration['url'],
            data=data.encode("utf-8"),
            stream=stream,
            timeout=self.configuration.get('timeout', 30),
            params={
                'user': self.configuration['user'],
                'password':  self.configuration['password'],
                'database': self.configuration['dbname']
            }
        )
        if r.status_code != 200:
            raise Exception(r.text)
        # logging.warning(r.json())
        return r.json()

    @staticmethod
    def _define_column_type(column):
        c = column.lower()
        f = re.search(r'^nullable\((.*)\)$', c)
        if f is not None:
            c = f.group(1)
        if c.startswith('int') or c.startswith('uint'):
            return TYPE_INTEGER
        elif c.startswith('float'):
            return TYPE_FLOAT
        elif c == 'datetime':
            return TYPE_DATETIME
        elif c == 'date':
            return TYPE_DATE
        else:
            return TYPE_STRING

    def _clickhouse_query(self, query):
        query += '\nFORMAT JSON'
        result = self._send_query(query)
        columns = [{'name': r['name'], 'friendly_name': r['name'],
                    'type': self._define_column_type(r['type'])} for r in result['meta']]
        # db converts value to string if its type equals UInt64
        columns_uint64 = [r['name'] for r in result['meta'] if r['type'] == 'UInt64']
        rows = result['data']
        for row in rows:
            for column in columns_uint64:
                row[column] = int(row[column])
        return {'columns': columns, 'rows': rows}

    def run_query(self, query, user):
        logger.debug("Clickhouse is about to execute query: %s", query)
        if query == "":
            json_data = None
            error = "Query is empty"
            return json_data, error
        try:
            q = self._clickhouse_query(query)
            data = json_dumps(q)
            error = None
        except Exception as e:
            data = None
            logging.exception(e)
            error = unicode(e)
        return data, error

register(ClickHouse)
