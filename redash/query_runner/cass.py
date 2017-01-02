import json
import logging

from redash.query_runner import BaseQueryRunner, register
from redash.utils import JSONEncoder

logger = logging.getLogger(__name__)

try:
    from cassandra.cluster import Cluster
    from cassandra.auth import PlainTextAuthProvider
    enabled = True
except ImportError:
    enabled = False


class Cassandra(BaseQueryRunner):
    noop_query = "SELECT dateof(now()) FROM system.local"

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

    def get_schema(self, get_stats=False):
        query = """
        SELECT columnfamily_name, column_name FROM system.schema_columns where keyspace_name ='{}';
        """.format(self.configuration['keyspace'])

        results, error = self.run_query(query, None)
        results = json.loads(results)

        schema = {}
        for row in results['rows']:
            table_name = row['columnfamily_name']
            column_name = row['column_name']
            if table_name not in schema:
                schema[table_name] = {'name': table_name, 'columns': []}
            schema[table_name]['columns'].append(column_name)

        return schema.values()

    def run_query(self, query, user):
        connection = None
        try:
            if self.configuration.get('username', '') and self.configuration.get('password', ''):
                auth_provider = PlainTextAuthProvider(username='{}'.format(self.configuration.get('username', '')),
                                                      password='{}'.format(self.configuration.get('password', '')))
                connection = Cluster([self.configuration.get('host', '')], auth_provider=auth_provider, protocol_version=3)
            else:
                connection = Cluster([self.configuration.get('host', '')], protocol_version=3)

            session = connection.connect()
            session.set_keyspace(self.configuration['keyspace'])
            logger.debug("Cassandra running query: %s", query)
            result = session.execute(query)

            column_names = result.column_names

            columns = self.fetch_columns(map(lambda c: (c, 'string'), column_names))

            rows = [dict(zip(column_names, row)) for row in result]

            data = {'columns': columns, 'rows': rows}
            json_data = json.dumps(data, cls=JSONEncoder)

            error = None
        except KeyboardInterrupt:
            error = "Query cancelled by user."
            json_data = None

        return json_data, error


class ScyllaDB(Cassandra):
    def __init__(self, configuration):
        super(ScyllaDB, self).__init__(configuration)

    @classmethod
    def type(cls):
        return "scylla"


register(Cassandra)
register(ScyllaDB)
