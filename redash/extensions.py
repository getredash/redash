import logging
from collections import OrderedDict as odict

from importlib_metadata import entry_points

# The global Redash extension registry
extensions = odict()

# The periodic Celery tasks as provided by Redash extensions.
# This is separate from the internal periodic Celery tasks in
# celery_schedule since the extension task discovery phase is
# after the configuration has already happened.
periodic_tasks = odict()

extension_logger = logging.getLogger(__name__)


def entry_point_loader(group_name, mapping, logger=None, *args, **kwargs):
    """
    Loads the list Python entry points with the given entry point group name
    (e.g. "redash.extensions"), calls each with the provided *args/**kwargs
    arguments and stores the results in the provided mapping under the name
    of the entry point.

    If provided, the logger is used for error and debugging statements.
    """
    if logger is None:
        logger = extension_logger

    for entry_point in entry_points().get(group_name, []):
        logger.info('Loading entry point "%s".', entry_point.name)
        try:
            # Then try to load the entry point (import and getattr)
            obj = entry_point.load()
        except (ImportError, AttributeError):
            # or move on
            logger.error(
                'Entry point "%s" could not be found.', entry_point.name, exc_info=True
            )
            continue

        if not callable(obj):
            logger.error('Entry point "%s" is not a callable.', entry_point.name)
            continue

        try:
            # then simply call the loaded entry point.
            mapping[entry_point.name] = obj(*args, **kwargs)
        except AssertionError:
            logger.error(
                'Entry point "%s" cound not be loaded.', entry_point.name, exc_info=True
            )
            continue


def load_extensions(app):
    """Load the Redash extensions for the given Redash Flask app.

    The extension entry point can return any type of value but
    must take a Flask application object.

    E.g.::

        def extension(app):
            app.logger.info("Loading the Foobar extenions")
            Foobar(app)

    """
    entry_point_loader("redash.extensions", extensions, logger=app.logger, app=app)


def load_periodic_tasks(logger=None):
    """Load the periodic tasks as defined in Redash extensions.

    The periodic task entry point needs to return a set of parameters
    that can be passed to Celery's add_periodic_task:

        https://docs.celeryproject.org/en/latest/userguide/periodic-tasks.html#entries

    E.g.::

        def add_two_and_two():
            return {
                'name': 'add 2 and 2 every 10 seconds'
                'sig': add.s(2, 2),
                'schedule': 10.0,  # in seconds or a timedelta
            }

    and then registered with an entry point under the "redash.periodic_tasks"
    group, e.g. in your setup.py::

        setup(
            # ...
            entry_points={
                "redash.periodic_tasks": [
                    "add_two_and_two = calculus.addition:add_two_and_two",
                ]
                # ...
            },
            # ...
        )
    """
    entry_point_loader("redash.periodic_tasks", periodic_tasks, logger=logger)


def init_app(app):
    load_extensions(app)
