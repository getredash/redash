import json

from redash.utils import JSONEncoder
from redash.query_runner import *

import logging
logger = logging.getLogger(__name__)

from collections import defaultdict

try:
    from pyhive import presto
    from pyhive.exc import DatabaseError
    enabled = True

except ImportError:
    enabled = False

PRESTO_TYPES_MAPPING = {
    "integer": TYPE_INTEGER,
    "tinyint": TYPE_INTEGER,
    "smallint": TYPE_INTEGER,
    "long": TYPE_INTEGER,
    "bigint": TYPE_INTEGER,
    "float": TYPE_FLOAT,
    "double": TYPE_FLOAT,
    "boolean": TYPE_BOOLEAN,
    "string": TYPE_STRING,
    "varchar": TYPE_STRING,
    "date": TYPE_DATE,
}

class PrettyConnection(presto.Connection):
    def _pretty(self, columns, data):
        r = []
        for row in data: # the top-level is an iterable of records (i.e. rows)
            c = []
            for (column, row) in zip(columns, row):
                c.append(self._pretty_(column["typeSignature"], row))
            r.append(c)
        return r

    def _pretty_(self, column, data):
        type = column["rawType"]
        try: iter(data) # check if the data is iterable
        except TypeError:
            return data # non-iterables can simply be directly shown
        if type == "row": # records should have their fields associated with types
            keys = column["literalArguments"]
            values = [self._pretty_(c, d) for c, d in zip(column["typeArguments"], data)]
            return dict(zip(keys, values))
        elif type == "array": # arrays should have their element types associated with each element
            rep = [column["typeArguments"][0]]*len(data)
            return [self._pretty_(c, d) for c, d in zip(rep, data)]
        elif type == "map": # maps should have their value types associated with each value (note that keys are always strings)
            value_type = column["typeArguments"][1]
            return {k: self._pretty_(value_type, v) for k, v in data.iteritems()}
        return data # unknown type, don't process it

    def cursor(self):
        return PrettyCursor(*self._args,**self._kwargs)

class PrettyCursor(presto.Cursor):
    def _process_response(self, response):
        """Given the JSON response from Presto's REST API, update the internal state with the next
        URI and any data from the response
        From https://github.com/dropbox/PyHive/blob/master/pyhive/presto.py#L282 on 6/17/2018
        Merges in https://github.com/vitillo/PyHive/blob/ab035edb24fb6c7fbef3587621c6e566edf41726/pyhive/presto.py#L236
        Removes raise DatabaseError so we see errors
        """
        # TODO handle HTTP 503
        if response.status_code != requests.codes.ok:
            fmt = "Unexpected status code {}\n{}"
            raise OperationalError(fmt.format(response.status_code, response.content))

        response_json = response.json()
        _logger.debug("Got response %s", response_json)
        assert self._state == self._STATE_RUNNING, "Should be running if processing response"
        self._nextUri = response_json.get('nextUri')
        self._columns = response_json.get('columns')
        if 'X-Presto-Clear-Session' in response.headers:
            propname = response.headers['X-Presto-Clear-Session']
            self._session_props.pop(propname, None)
        if 'X-Presto-Set-Session' in response.headers:
            propname, propval = response.headers['X-Presto-Set-Session'].split('=', 1)
            self._session_props[propname] = propval
        if 'data' in response_json:
            assert self._columns
            new_data = self._pretty(self._columns,response_json['data'])
            self._decode_binary(new_data)
            self._data += map(tuple, new_data)
        if 'nextUri' not in response_json:
            self._state = self._STATE_FINISHED

def pretty_connect(*args,**kwargs):
    return PrettyConnection(*args,**kwargs)

class Presto(BaseQueryRunner):
    noop_query = 'SHOW TABLES'

    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'host': {
                    'type': 'string'
                },
                'port': {
                    'type': 'number'
                },
                'schema': {
                    'type': 'string'
                },
                'catalog': {
                    'type': 'string'
                },
                'username': {
                    'type': 'string'
                }
            },
            'required': ['host']
        }

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def type(cls):
        return "presto"

    def __init__(self, configuration):
        super(Presto, self).__init__(configuration)

    def get_schema(self, get_stats=False):
        schema = {}
        query = """
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        """

        results, error = self.run_query(query, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json.loads(results)

        for row in results['rows']:
            table_name = '{}.{}'.format(row['table_schema'], row['table_name'])
            
            if table_name not in schema:
                schema[table_name] = {'name': table_name, 'columns': []}

            schema[table_name]['columns'].append(row['column_name'])

        return schema.values()

    def run_query(self, query, user):
        connection = presto.pretty_connect(
                host=self.configuration.get('host', ''),
                port=self.configuration.get('port', 8080),
                username=self.configuration.get('username', 'redash'),
                catalog=self.configuration.get('catalog', 'hive'),
                schema=self.configuration.get('schema', 'default'))

        cursor = connection.cursor()


        try:
            cursor.execute(query)
            column_tuples = [(i[0], PRESTO_TYPES_MAPPING.get(i[1], None)) for i in cursor.description]
            columns = self.fetch_columns(column_tuples)
            rows = [dict(zip(([c['name'] for c in columns]), r)) for i, r in enumerate(cursor.fetchall())]
            data = {'columns': columns, 'rows': rows}
            json_data = json.dumps(data, cls=JSONEncoder)
            error = None
        except DatabaseError as db:
            json_data = None
            default_message = 'Unspecified DatabaseError: {0}'.format(db.message)
            message = db.message.get('failureInfo', {'message', None}).get('message')
            error = default_message if message is None else message
        except (KeyboardInterrupt, InterruptException) as e:
            cursor.cancel()
            error = "Query cancelled by user."
            json_data = None
        except Exception as ex:
            json_data = None
            error = ex.message
            if not isinstance(error, basestring):
                error = unicode(error)

        return json_data, error

register(Presto)
