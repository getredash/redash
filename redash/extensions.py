import logging
from collections import OrderedDict as odict

from importlib_metadata import entry_points

# The global Redash extension registry
extensions = odict()

# The periodic RQ jobs as provided by Redash extensions.
# This is separate from the internal periodic RQ jobs
# since the extension job discovery phase is
# after the configuration has already happened.
periodic_jobs = odict()

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


def load_periodic_jobs(logger=None):
    """Load the periodic jobs as defined in Redash extensions.

    The periodic task entry point needs to return a set of parameters
    that can be passed to RQ Scheduler API:

        https://github.com/rq/rq-scheduler#periodic--repeated-jobs

    E.g.::

        def add_two_and_two():
            return {
                "func": add,
                "args": [2, 2]
                "interval": 10,  # in seconds or as a timedelta
            }

    and then registered with an entry point under the "redash.periodic_jobs"
    group, e.g. in your setup.py::

        setup(
            # ...
            entry_points={
                "redash.periodic_jobs": [
                    "add_two_and_two = calculus.addition:add_two_and_two",
                ]
                # ...
            },
            # ...
        )
    """
    entry_point_loader("redash.periodic_jobs", periodic_jobs, logger=logger)


def init_app(app):
    load_extensions(app)
