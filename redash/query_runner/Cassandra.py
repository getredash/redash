import sys
import json
import logging

import decimal
import datetime

from redash.utils import JSONEncoder,json_dumps
from redash.query_runner import *

logger = logging.getLogger(__name__)
# integer, float, boolean, string, datetime
types_map = {
    'boolean': TYPE_BOOLEAN,
    'int': TYPE_INTEGER,
    'bigint': TYPE_INTEGER,
    'varint': TYPE_INTEGER,
    'smallint': TYPE_INTEGER,
    'tinyint': TYPE_INTEGER,
    'float': TYPE_FLOAT,
    'double': TYPE_FLOAT,
    'date': TYPE_DATE,
    'timestamp': TYPE_DATETIME,
    'ascii': TYPE_STRING,
    'varchar': TYPE_STRING,
    'text': TYPE_STRING,
}

class CassEncoder(JSONEncoder):
    """Custom JSON encoding class, to handle Decimal and datetime.date instances."""

    def default(self, o):
        from cassandra.util import Date

        logger.debug("Object type: %s" % type(o))
        if isinstance (o, Date):
            return o.date().isoformat()

        super(redash.utils.JSONEncoder, self).default(o)

class Cassandra(BaseSQLQueryRunner):
    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'host': {
                    'type': 'string',
                    'default': '127.0.0.1'
                },
                'keyspace': {
                    'type': 'string',
                    'title': 'Keyspace name'
                },
                'port': {
                    'type': 'number',
                    'default': 9042,
                }
            },
            'required': ['host','keyspace'],
            'secret': ['passwd']
        }

    @classmethod
    def name(cls):
        return "Cassandra"

    @classmethod
    def enabled(cls):
        try:
            logger.debug("Try and import cassandra.cluster")
            from cassandra.cluster import Cluster
        except ImportError, e:
            logger.warning("failed to import %s", e)
            return False
        logger.info("Cassandra should be enabled")
        return True

    def _get_tables(self, schema):
        systemSchemas = ['system','system_schema','system_auth','system_traces','system_distributed']
        query = """
        SELECT keyspace_name,table_name,column_name,type from system_schema.columns
        """

        results, error = self.run_query(query)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json.loads(results)

        for row in results['rows']:
            if (row['keyspace_name'] not in systemSchemas) :
                if (row['keyspace_name'] != self.configuration['keyspace']):
                    table_name = '{}.{}'.format(row['keyspace_name'], row['table_name'])
                else:
                    table_name = row['table_name']
                if table_name not in schema:
                    schema[table_name] = {'name': table_name, 'columns': [], 'types': []}
                schema[table_name]['columns'].append(row['column_name'])
                schema[table_name]['types'].append(row['type'])

        return schema.values()

    def run_query(self, query):
        from cassandra.cluster import Cluster

        try:
            contacts = self.configuration.get('host','').split(',')
            cluster = Cluster(contacts)
            session = cluster.connect(self.configuration.get('keyspace'))

            logger.debug("Cassandra running query: %s", query)
            data = session.execute(query)

            if data.current_rows:
                ##schema = self.get_schema()
                ##column_names = result.column_names
                ##columns = self.fetch_columns(map(lambda c: (c, TYPE_STRING), column_names))

                logger.debug("fields: %s",data[0]._fields)
                columns = self.fetch_columns([(i, TYPE_STRING) for i in data[0]._fields])
                print 'columns: %s' % columns
                rows = []
                for r in data:
                  logger.debug("row: %s",r)
                  rows.append(r._asdict())

                pack = {'columns': columns, 'rows': rows}
                json_data = json.dumps(pack, cls=CassEncoder)
                error = None
            else:
                json_data = None
                error = "No data was returned."

        except KeyboardInterrupt:
            error = "Query cancelled by user."
            json_data = None
        except Exception as e:
            raise sys.exc_info()[1], None, sys.exc_info()[2]

        return json_data, error


register(Cassandra)
