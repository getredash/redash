import json
import sys
import logging

from redash.query_runner import *
from redash.utils import JSONEncoder

logger = logging.getLogger(__name__)

try:
    from cassandra.cluster import Cluster
    enabled = True
except ImportError:
    enabled = False

class Cassandra(BaseQueryRunner):
    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'host': {
                    'type': 'string',
                },
                'port': {
                    'type': 'number',
                    'default': 9042,
                },
                'keyspace': {
                    'type': 'string',
                    'title': 'Keyspace name'
                },
                'username': {
                    'type': 'string',
                    'title': 'Username'
                },
                'password': {
                    'type': 'string',
                    'title': 'Password'
                }
            },
            'required': ['keyspace', 'host']
        }

    @classmethod
    def type(cls):
        return "Cassandra"

    def _get_tables(self, schema):
        query = """
        select columnfamily_name from system.schema_columnfamilies where keyspace_name = '{}';
        """.format(self.configuration['Keyspace'])

        results = self.run_query(query)
        return results, error

    def run_query(self, query):
        from cassandra.cluster import Cluster
        connection = None
        try:
            if self.configuration.get('username', '') and self.configuration.get('password', ''):
                auth_provider = PlainTextAuthProvider(username='{}'.format(self.configuration.get('username', '')),
                                                      password='{}'.format(self.configuration.get('password', '')))
                connection = Cluster([self.configuration.get('host', '')], auth_provider=auth_provider)
            else:
                connection = Cluster([self.configuration.get('host', '')])

            session = connection.connect()
            logger.debug("Cassandra running query: %s", query)
            result = session.execute(query)

            column_names = result.column_names

            columns = self.fetch_columns(map(lambda c: (c, 'string'), column_names))

            rows = [dict(zip(column_names, row)) for row in result]

            data = {'columns': columns, 'rows': rows}
            json_data = json.dumps(data, cls=JSONEncoder)

            error = None

        except cassandra.cluster.Error, e:
            error = e.args[1]
        except KeyboardInterrupt:
            error = "Query cancelled by user."

        return json_data, error

class ScyllaDB(Cassandra):

    def __init__(self, configuration):
        super(ScyllaDB, self).__init__(configuration)

    @classmethod
    def type(cls):
        return "scylla"

register(Cassandra)
register(ScyllaDB)
