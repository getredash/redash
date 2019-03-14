# -*- coding: utf-8 -*-
from collections import OrderedDict as odict

from importlib_resources import contents, is_resource, path
from importlib_metadata import entry_points

BUNDLE_DIRECTORY = 'bundle'

# The global Redash extension registry
extensions = odict()

# The global Redash bundle registry
bundles = odict()

# The periodic Celery tasks as provided by Redash extensions.
# This is separate from the internal periodic Celery tasks in
# celery_schedule since the extension task discovery phase is
# after the configuration has already happened.
periodic_tasks = odict()


def resource_isdir(module, resource):
    """Whether a given resource is a directory in the given module

    https://importlib-resources.readthedocs.io/en/latest/migration.html#pkg-resources-resource-isdir
    """
    try:
        return resource in contents(module) and not is_resource(module, resource)
    except (ImportError, TypeError):
        # module isn't a package, so can't have a subdirectory/-package
        return False


def entry_point_module(entry_point):
    """Returns the dotted module path for the given entry point"""
    return entry_point.pattern.match(entry_point.value).group('module')


def load_extensions(app):
    """Load the Redash extensions for the given Redash Flask app.

    The extension entry point can return any type of value but
    must take a Flask application object.

    E.g.::

        def extension(app):
            app.logger.info("Loading the Foobar extenions")
            Foobar(app)

    """
    for entry_point in entry_points().get('redash.extensions', []):
        app.logger.info('Loading Redash extension "%s".', entry_point.name)
        try:
            # Then try to load the entry point (import and getattr)
            obj = entry_point.load()
        except (ImportError, AttributeError):
            # or move on
            app.logger.error('Redash extension "%s" could not be found.', entry_point.name)
            continue

        if not callable(obj):
            app.logger.error('Redash extension "%s" is not a callable.', entry_point.name)
            continue

        # then simply call the loaded entry point.
        extensions[entry_point.name] = obj(app)


def load_bundles(app):
    """"Load bundles as defined in Redash extensions.

    The bundle entry point can be defined as a dotted path to a module
    or a callable, but it won't be called but just used as a means
    to find the files under its file system path.

    The name of the directory it looks for files in is "bundle".

    So a Python package with an extension bundle could look like this::

        my_extensions/
        ├── __init__.py
        └── wide_footer
            ├── __init__.py
            └── bundle
                ├── extension.js
                └── styles.css

    and would then need to register the bundle with an entry point
    under the "redash.periodic_tasks" group, e.g. in your setup.py::

        setup(
            # ...
            entry_points={
                "redash.bundles": [
                    "wide_footer = my_extensions.wide_footer",
                ]
                # ...
            },
            # ...
        )

    """
    for entry_point in entry_points().get('redash.bundles', []):
        app.logger.info('Loading Redash bundle "%s".', entry_point.name)
        module = entry_point_module(entry_point)
        # Try to get a list of bundle files
        if not resource_isdir(module, BUNDLE_DIRECTORY):
            app.logger.error('Redash bundle directory "%s" could not be found.', entry_point.name)
            continue
        with path(module, BUNDLE_DIRECTORY) as bundle_dir:
            bundles[entry_point.name] = list(bundle_dir.rglob("*"))


def load_periodic_tasks(logger):
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
    for entry_point in entry_points().get('redash.periodic_tasks', []):
        logger.info('Loading periodic Redash tasks "%s" from "%s".', entry_point.name, entry_point.value)
        try:
            periodic_tasks[entry_point.name] = entry_point.load()
        except (ImportError, AttributeError):
            # and move on if it couldn't load it
            logger.error('Periodic Redash task "%s" could not be found at "%s".', entry_point.name, entry_point.value)


def init_app(app):
    load_extensions(app)
    load_bundles(app)
