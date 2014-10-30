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


def _friendly_name(key):
    return " ".join(key.capitalize().split("_"))


class ConfigurationField(object):
    def __init__(self, key, name=None, mandatory=True, field_type="string"):
        if name is None:
            name = _friendly_name(key)

        self.key = key
        self.name = name
        self.mandatory = mandatory
        self.field_type = field_type

    def to_dict(self):
        return {
            "key": self.key,
            "name": self.name,
            "mandatory": self.mandatory,
            "field_type": self.field_type
        }


class Configuration(object):
    def __init__(self, fields):
        self.fields = {field.key: field for field in fields}

    def parse(self, configuration):
        parsed = {}

        for key, field in self.fields.iteritems():
            if field.mandatory and key not in configuration:
                raise ConfigurationError("Missing mandatory field: {}".format(field.name))

            if key in configuration:
                parsed[key] = configuration[key]

        return parsed

    def get_input_definition(self):
        return [field.to_dict() for field in self.fields]


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