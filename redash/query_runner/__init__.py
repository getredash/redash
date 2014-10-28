import logging
import json

logger = logging.getLogger(__name__)

__all__ = [
    'ConfigurationError',
    'BaseQueryRunner',
    'TYPE_DATETIME',
    'TYPE_BOOLEAN',
    'TYPE_INTEGER',
    'TYPE_STRING',
    'TYPE_DATE',
    'TYPE_FLOAT',
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


class ConfigurationError(RuntimeError):
    pass


class BaseQueryRunner(object):
    def __init__(self, configuration_json):
        try:
            self.configuration = json.loads(configuration_json)
        except ValueError:
            raise ConfigurationError("Invalid configuration syntax")

    @classmethod
    def name(cls):
        raise NotImplementedError()

    @classmethod
    def enabled(cls):
        return True

    @classmethod
    def annotate_query(cls):
        return True

    @classmethod
    def configuration_fields(cls):
        return []

    def run_query(self, query):
        raise NotImplementedError()


query_runners = {}


def register(query_runner_type, query_runner_class):
    global query_runners
    if query_runner_class.enabled():
        logger.info("Registering %s query runner.", query_runner_type)
        query_runners[query_runner_type] = query_runner_class
    else:
        logger.warning("%s query runner not enabled; not registering", query_runner_type)


def get_query_runner(query_runner_type, configuration_json):
    global query_runners
    query_runner_class = query_runners.get(query_runner_type, None)
    if query_runner_class is None:
        return None

    return query_runner_class(configuration_json)


def import_query_runners(query_runner_imports):
    for runner_import in query_runner_imports:
        __import__(runner_import)