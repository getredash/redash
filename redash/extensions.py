from importlib_metadata import entry_points

# The global Redash extension registry
extensions = {}

# The periodic Celery task registry
periodic_tasks = {}


def init_app(app):
    """Load the Redash extensions for the given Redash Flask app.

    The extension entry pooint can return any type of value but
    must take a Flask application object.

    E.g.::

        def extension(app):
            app.logger.info("Loading the Foobar extenions")
            Foobar(app)

    """
    for entry_point in entry_points().get('redash.extensions', []):
        app.logger.info('Loading Redash extension %s.', entry_point.name)
        init_extension = entry_point.load()
        extensions[entry_point.name] = init_extension(app)


def init_periodic_tasks(app):
    """Load the Redash extensions for the given Redash Flask app.

    The periodic task entry point needs to return a set of parameters
    that can be passed to Celery's add_periodic_task:

        https://docs.celeryproject.org/en/latest/userguide/periodic-tasks.html#entries

    E.g.::

        def periodic_task():
            return {
                'name': 'add 2 and 2 every 10 seconds'
                'sig': add.s(2, 2),
                'schedule': 10.0,
            }

    """
    for entry_point in entry_points().get('redash.periodic_tasks', []):
        app.logger.info('Loading Redash periodic tasks %s.', entry_point.name)
        init_periodic_task = entry_point.load()
        periodic_tasks[entry_point.name] = init_periodic_task()
