from types import ModuleType
from importlib_resources import contents, is_resource, path
from importlib_metadata import entry_points

BUNDLE_DIRECTORY = 'bundle'

# The global Redash extension registry
extensions = {}


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


def module_bundle_files(module):
    if not resource_isdir(module, BUNDLE_DIRECTORY):
        return

    with path(module, BUNDLE_DIRECTORY) as bundle_dir:
        # Copy content of extension bundle into extensions directory
        return list(bundle_dir.rglob("*"))


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
        module = entry_point_module(entry_point)
        # First of all, try to get a list of bundle files
        extensions[entry_point.name]['resource_list'] = module_bundle_files(module)

        try:
            # Then try to load the entry point (import and getattr)
            obj = entry_point.load()
        except (ImportError, AttributeError):
            # or move on
            app.logger.error('Extension %s could not be found.', entry_point.name)
            extensions[entry_point.name]['extension'] = None
            continue

        # Otherwise check if the loaded entry point is a module
        if isinstance(obj, ModuleType):
            app.logger.info('Extension %s is a module.', entry_point.name)
            extensions[entry_point.name]['extension'] = obj
        # or simply call the loaded entry point instead.
        else:
            app.logger.info('Extension %s is a callable.', entry_point.name)
            extensions[entry_point.name]['extension'] = obj(app)
