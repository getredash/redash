import logging
import json

from redash import settings

logger = logging.getLogger(__name__)

__all__ = [
    'BaseQueryRunner',
    'InterruptException',
    'BaseSQLQueryRunner',
    'TYPE_DATETIME',
    'TYPE_BOOLEAN',
    'TYPE_INTEGER',
    'TYPE_STRING',
    'TYPE_DATE',
    'TYPE_FLOAT',
    'SUPPORTED_COLUMN_TYPES',
    'register',
    'get_query_runner',
    'import_query_runners'
]

# Valid types of columns returned in results:
TYPE_INTEGER = 'integer'
TYPE_FLOAT = 'float'
TYPE_BOOLEAN = 'boolean'
TYPE_STRING = 'string'
TYPE_DATETIME = 'datetime'
TYPE_DATE = 'date'

SUPPORTED_COLUMN_TYPES = set([
    TYPE_INTEGER,
    TYPE_FLOAT,
    TYPE_BOOLEAN,
    TYPE_STRING,
    TYPE_DATETIME,
    TYPE_DATE
])


class InterruptException(Exception):
    pass


class BaseQueryRunner(object):
    noop_query = None

    def __init__(self, configuration):
        self.syntax = 'sql'
        self.configuration = configuration

    @classmethod
    def name(cls):
        return cls.__name__

    @classmethod
    def type(cls):
        return cls.__name__.lower()

    @classmethod
    def enabled(cls):
        return True

    @classmethod
    def annotate_query(cls):
        return True

    @classmethod
    def configuration_schema(cls):
        return {}

    def test_connection(self):
        if self.noop_query is None:
            raise NotImplementedError()
        data, error = self.run_query(self.noop_query, None)

        if error is not None:
            raise Exception(error)

    def run_query(self, query, user):
        raise NotImplementedError()

    def fetch_columns(self, columns):
        column_names = []
        duplicates_counter = 1
        new_columns = []

        for col in columns:
            column_name = col[0]
            if column_name in column_names:
                column_name = "{}{}".format(column_name, duplicates_counter)
                duplicates_counter += 1

            column_names.append(column_name)
            new_columns.append({'name': column_name,
                                'friendly_name': column_name,
                                'type': col[1]})

        return new_columns

    def get_schema(self, get_stats=False):
        return []

    def _run_query_internal(self, query):
        results, error = self.run_query(query, None)

        if error is not None:
            raise Exception("Failed running query [%s]." % query)
        return json.loads(results)['rows']

    @classmethod
    def to_dict(cls):
        return {
            'name': cls.name(),
            'type': cls.type(),
            'configuration_schema': cls.configuration_schema()
        }


class BaseSQLQueryRunner(BaseQueryRunner):
    def __init__(self, configuration):
        super(BaseSQLQueryRunner, self).__init__(configuration)

    def get_schema(self, get_stats=False):
        schema_dict = {}
        self._get_tables(schema_dict)
        if settings.SCHEMA_RUN_TABLE_SIZE_CALCULATIONS and get_stats:
            self._get_tables_stats(schema_dict)
        return schema_dict.values()

    def _get_tables(self, schema_dict):
        return []

    def _get_tables_stats(self, tables_dict):
        for t in tables_dict.keys():
            if type(tables_dict[t]) == dict:
                res = self._run_query_internal('select count(*) as cnt from %s' % t)
                tables_dict[t]['size'] = res[0]['cnt']

query_runners = {}


def register(query_runner_class):
    global query_runners
    if query_runner_class.enabled():
        logger.debug("Registering %s (%s) query runner.", query_runner_class.name(), query_runner_class.type())
        query_runners[query_runner_class.type()] = query_runner_class
    else:
        logger.debug("%s query runner enabled but not supported, not registering. Either disable or install missing dependencies.", query_runner_class.name())


def get_query_runner(query_runner_type, configuration):
    query_runner_class = query_runners.get(query_runner_type, None)
    if query_runner_class is None:
        return None

    return query_runner_class(configuration)


def get_configuration_schema_for_query_runner_type(query_runner_type):
    query_runner_class = query_runners.get(query_runner_type, None)
    if query_runner_class is None:
        return None

    return query_runner_class.configuration_schema()


def import_query_runners(query_runner_imports):
    for runner_import in query_runner_imports:
        __import__(runner_import)
