import logging

logger = logging.getLogger(__name__)

__all__ = ["BaseDestination", "register", "get_destination", "import_destinations"]


class BaseDestination(object):
    deprecated = False

    def __init__(self, configuration):
        self.configuration = configuration

    @classmethod
    def name(cls):
        return cls.__name__

    @classmethod
    def type(cls):
        return cls.__name__.lower()

    @classmethod
    def icon(cls):
        return "fa-bullseye"

    @classmethod
    def enabled(cls):
        return True

    @classmethod
    def configuration_schema(cls):
        return {}

    def notify(self, alert, query, user, new_state, app, host, options):
        raise NotImplementedError()

    @classmethod
    def to_dict(cls):
        return {
            "name": cls.name(),
            "type": cls.type(),
            "icon": cls.icon(),
            "configuration_schema": cls.configuration_schema(),
        }


destinations = {}


def register(destination_class):
    global destinations
    if destination_class.enabled():
        logger.debug(
            "Registering %s (%s) destinations.",
            destination_class.name(),
            destination_class.type(),
        )
        destinations[destination_class.type()] = destination_class
    else:
        logger.warning(
            "%s destination enabled but not supported, not registering. Either disable or install missing dependencies.",
            destination_class.name(),
        )


def get_destination(destination_type, configuration):
    destination_class = destinations.get(destination_type, None)
    if destination_class is None:
        return None
    return destination_class(configuration)


def get_configuration_schema_for_destination_type(destination_type):
    destination_class = destinations.get(destination_type, None)
    if destination_class is None:
        return None

    return destination_class.configuration_schema()


def import_destinations(destination_imports):
    for destination_import in destination_imports:
        __import__(destination_import)
