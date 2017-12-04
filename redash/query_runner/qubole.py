from __future__ import absolute_import
import time
import requests
import logging
from cStringIO import StringIO

from redash.query_runner import BaseQueryRunner, register
from redash.query_runner import TYPE_STRING
from redash.utils import json_dumps

try:
    import qds_sdk
    from qds_sdk.qubole import Qubole as qbol
    from qds_sdk.commands import Command, HiveCommand, PrestoCommand
    enabled = True
except ImportError:
    enabled = False


class Qubole(BaseQueryRunner):

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "endpoint": {
                    "type": "string",
                    "title": "API Endpoint",
                    "default": "https://api.qubole.com"
                },
                "token": {
                    "type": "string",
                    "title": "Auth Token"
                },
                "cluster": {
                    "type": "string",
                    "title": "Cluster Label",
                    "default": "default"
                },
                "query_type": {
                    "type": "string",
                    "title": "Query Type (hive or presto)",
                    "default": "hive"
                }
            },
            "order": ["endpoint", "token", "cluster"],
            "required": ["endpoint", "token", "cluster"],
            "secret": ["token"]
        }

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def annotate_query(cls):
        return False

    def test_connection(self):
        headers = self._get_header()
        r = requests.head("%s/api/latest/users" % self.configuration['endpoint'], headers=headers)
        r.status_code == 200

    def run_query(self, query, user):
        qbol.configure(api_token=self.configuration['token'],
                       api_url='%s/api' % self.configuration['endpoint'])

        try:
            cls = PrestoCommand if(self.configuration['query_type'] == 'presto') else HiveCommand
            cmd = cls.create(query=query, label=self.configuration['cluster'])
            logging.info("Qubole command created with Id: %s and Status: %s", cmd.id, cmd.status)

            while not Command.is_done(cmd.status):
                time.sleep(qbol.poll_interval)
                cmd = Command.find(cmd.id)
                logging.info("Qubole command Id: %s and Status: %s", cmd.id, cmd.status)

            rows = []
            columns = []
            error = None

            if cmd.status == 'done':
                fp = StringIO()
                cmd.get_results(fp=fp, inline=True, delim='\t', fetch=False,
                                qlog=None, arguments=['true'])

                results = fp.getvalue()
                fp.close()

                data = results.split('\r\n')
                columns = self.fetch_columns([(i, TYPE_STRING) for i in data.pop(0).split('\t')])
                rows = [dict(zip((c['name'] for c in columns), row.split('\t'))) for row in data]

            json_data = json_dumps({'columns': columns, 'rows': rows})
        except KeyboardInterrupt:
            logging.info('Sending KILL signal to Qubole Command Id: %s', cmd.id)
            cmd.cancel()
            error = "Query cancelled by user."
            json_data = None

        return json_data, error

    def get_schema(self, get_stats=False):
        schemas = {}
        try:
            headers = self._get_header()
            content = requests.get("%s/api/latest/hive?describe=true&per_page=10000" %
                                   self.configuration['endpoint'], headers=headers)
            data = content.json()

            for schema in data['schemas']:
                tables = data['schemas'][schema]
                for table in tables:
                    table_name = table.keys()[0]
                    columns = [f['name'] for f in table[table_name]['columns']]

                    if schema != 'default':
                        table_name = '{}.{}'.format(schema, table_name)

                    schemas[table_name] = {'name': table_name, 'columns': columns}

        except Exception as e:
            logging.error("Failed to get schema information from Qubole. Error {}".format(str(e)))

        return schemas.values()

    def _get_header(self):
        return {"Content-type": "application/json", "Accept": "application/json",
                "X-AUTH-TOKEN": self.configuration['token']}

register(Qubole)
