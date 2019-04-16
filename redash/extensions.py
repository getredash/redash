import os
from pkg_resources import iter_entry_points, resource_isdir, resource_listdir


def init_app(app):
    """
    Load the Redash extensions for the given Redash Flask app.
    """
    if not hasattr(app, 'redash_extensions'):
        app.redash_extensions = {}

    for entry_point in iter_entry_points('redash.extensions'):
        app.logger.info('Loading Redash extension %s.', entry_point.name)
        try:
            extension = entry_point.load()
            app.redash_extensions[entry_point.name] = {
                "entry_function": extension(app),
                "resources_list": []
            }
        except ImportError:
            app.logger.info('%s does not have a callable and will not be loaded.', entry_point.name)
            (root_module, _) = os.path.splitext(entry_point.module_name)
            content_folder_relative = os.path.join(entry_point.name, 'bundle')

            # If it's a frontend extension only, store a list of files in the bundle directory.
            if resource_isdir(root_module, content_folder_relative):
                app.redash_extensions[entry_point.name] = {
                    "entry_function": None,
                    "resources_list": resource_listdir(root_module, content_folder_relative)
                }
