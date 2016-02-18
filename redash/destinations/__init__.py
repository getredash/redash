import logging
import json

import jsonschema
from jsonschema import ValidationError
from redash import settings

logger = logging.getLogger(__name__)

__all__ = [
    'ValidationError',
    'BaseDestination',
    'register',
    'get_destination',
    'import_destinations'
]


class BaseDestination(object):
    def __init__(self, configuration):
        jsonschema.validate(configuration, self.configuration_schema())
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
    def configuration_schema(cls):
        return {}

    def notify(self, query):
        raise NotImplementedError()

    @classmethod
    def to_dict(cls):
        return {
            'name': cls.name(),
            'type': cls.type(),
            'configuration_schema': cls.configuration_schema()
        }


destinations = {}


def register(destination_class):
    global destinations
    if destination_class.enabled():
        logger.debug("Registering %s (%s) destinations.", destination_class.name(), destination_class.type())
        destinations[destination_class.type()] = destination_class 
    else:
        logger.warning("%s destination enabled but not supported, not registering. Either disable or install missing dependencies.", destination_class.name())


def get_destination(destination_type, configuration_json):
    destination_class = destinations.get(destination_type, None)
    if destination_class is None:
        return None

    return destination_class(json.loads(configuration_json))


def validate_configuration(destination_type, configuration_json):
    destination_class = destinations.get(destination_type, None)
    if destination_class is None:
        return False

    try:
        if isinstance(configuration_json, basestring):
            configuration = json.loads(configuration_json)
        else:
            configuration = configuration_json
        jsonschema.validate(configuration, destination_class.configuration_schema())
    except (ValidationError, ValueError):
        return False

    return True


def import_destinations(destination_imports):
    for destination_import in destination_imports:
        __import__(destination_import)
