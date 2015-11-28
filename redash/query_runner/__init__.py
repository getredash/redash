import logging
import json

import jsonschema
from jsonschema import ValidationError

logger = logging.getLogger(__name__)

__all__ = [
    'ValidationError',
    'BaseQueryRunner',
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

class BaseQueryRunner(object):
    def __init__(self, configuration):
        jsonschema.validate(configuration, self.configuration_schema())
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

    def run_query(self, query):
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

    def get_schema(self):
        return []

    def _run_query_internal(self, query):
        results, error = self.run_query(query)

        if error is not None:
            raise Exception("Failed running query [%s]." % query)
        return json.loads(results)['rows']

    def _get_table_sizes(self, tables_dict):
        for t in tables_dict.keys():
            if type(tables_dict[t]) == dict:
                res = self._run_query_internal('select count(*) as cnt from %s' % t) 
                tables_dict[t]['size'] = res[0]['cnt']

    @classmethod
    def to_dict(cls):
        return {
            'name': cls.name(),
            'type': cls.type(),
            'configuration_schema': cls.configuration_schema()
        }


query_runners = {}


def register(query_runner_class):
    global query_runners
    if query_runner_class.enabled():
        logger.debug("Registering %s (%s) query runner.", query_runner_class.name(), query_runner_class.type())
        query_runners[query_runner_class.type()] = query_runner_class
    else:
        logger.warning("%s query runner enabled but not supported, not registering. Either disable or install missing dependencies.", query_runner_class.name())


def get_query_runner(query_runner_type, configuration_json):
    query_runner_class = query_runners.get(query_runner_type, None)
    if query_runner_class is None:
        return None

    return query_runner_class(json.loads(configuration_json))


def validate_configuration(query_runner_type, configuration_json):
    query_runner_class = query_runners.get(query_runner_type, None)
    if query_runner_class is None:
        return False

    try:
        if isinstance(configuration_json, basestring):
            configuration = json.loads(configuration_json)
        else:
            configuration = configuration_json
        jsonschema.validate(configuration, query_runner_class.configuration_schema())
    except (ValidationError, ValueError):
        return False

    return True


def import_query_runners(query_runner_imports):
    for runner_import in query_runner_imports:
        __import__(runner_import)
