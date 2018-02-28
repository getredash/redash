from pkg_resources import iter_entry_points


def init_extensions(app):
    """
    Load the Redash extensions for the given Redash Flask app.
    """
    if not hasattr(app, 'redash_extensions'):
        app.redash_extensions = {}

    for entry_point in iter_entry_points('redash.extensions'):
        app.logger.info('Loading Redash extension %s.', entry_point.name)
        extension = entry_point.load()
        app.redash_extensions[entry_point.name] = extension(app)
