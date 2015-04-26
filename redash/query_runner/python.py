import sys
import json
import logging

from redash.query_runner import *
from redash import models

import importlib

logger = logging.getLogger(__name__)

from RestrictedPython import compile_restricted
from RestrictedPython.Guards import safe_builtins

ALLOWED_MODULES = {}


def custom_write(obj):
    """
    Custom hooks which controls the way objects/lists/tuples/dicts behave in
    RestrictedPython
    """
    return obj


def custom_import(name, globals=None, locals=None, fromlist=(), level=0):
    if name in ALLOWED_MODULES:
        m = None
        if ALLOWED_MODULES[name] is None:
            m = importlib.import_module(name)
            ALLOWED_MODULES[name] = m
        else:
            m = ALLOWED_MODULES[name]

        return m

    raise Exception("'{0}' is not configured as a supported import module".format(name))

def custom_get_item(obj, key):
    return obj[key]

def get_query_result(query_id):
    try:
        query = models.Query.get_by_id(query_id)
    except models.Query.DoesNotExist:
        raise Exception("Query id %s does not exist." % query_id)

    if query.latest_query_data is None:
        raise Exception("Query does not have results yet.")

    if query.latest_query_data.data is None:
        raise Exception("Query does not have results yet.")

    return json.loads(query.latest_query_data.data)


def execute_query(data_source_name_or_id, query):
    try:
        if type(data_source_name_or_id) == int:
            data_source = models.DataSource.get_by_id(data_source_name_or_id)
        else:
            data_source = models.DataSource.get(models.DataSource.name==data_source_name_or_id)
    except models.DataSource.DoesNotExist:
        raise Exception("Wrong data source name/id: %s." % data_source_name_or_id)

    query_runner = get_query_runner(data_source.type, data_source.options)

    data, error = query_runner.run_query(query)
    if error is not None:
        raise Exception(error)

    # TODO: allow avoiding the json.dumps/loads in same process
    return json.loads(data)


def add_result_column(result, column_name, friendly_name, column_type):
    """ Helper function to add columns inside a Python script running in re:dash in an easier way """
    if column_type not in SUPPORTED_COLUMN_TYPES:
        raise Exception("'{0}' is not a supported column type".format(column_type))

    if not "columns" in result:
        result["columns"] = []

    result["columns"].append({
        "name" : column_name,
        "friendly_name" : friendly_name,
        "type" : column_type
    })


def add_result_row(result, values):
    if not "rows" in result:
        result["rows"] = []

    result["rows"].append(values)


class Python(BaseQueryRunner):
    """
    This is very, very unsafe. Use at your own risk with people you really trust.
    """
    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'allowedImportModules': {
                    'type': 'string',
                    'title': 'Modules to import prior to running the script'
                }
            },
        }

    @classmethod
    def enabled(cls):
        return True

    @classmethod
    def annotate_query(cls):
        return False

    def __init__(self, configuration_json):
        global ALLOWED_MODULES

        super(Python, self).__init__(configuration_json)

        self.syntax = "python"

        if self.configuration.get("allowedImportModules", None):
            for item in self.configuration["allowedImportModules"].split(","):
                ALLOWED_MODULES[item] = None

    def run_query(self, query):
        try:
            error = None

            code = compile_restricted(query, '<string>', 'exec')

            safe_builtins["_write_"] = custom_write
            safe_builtins["__import__"] = custom_import
            safe_builtins["_getattr_"] = getattr
            safe_builtins["getattr"] = getattr
            safe_builtins["_setattr_"] = setattr
            safe_builtins["setattr"] = setattr
            safe_builtins["setattr"] = setattr
            safe_builtins["_getitem_"] = custom_get_item

            script_locals = { "result" : { "rows" : [], "columns" : [] } }

            restricted_globals = dict(__builtins__=safe_builtins)
            restricted_globals["get_query_result"] = get_query_result
            restricted_globals["execute_query"] = execute_query
            restricted_globals["add_result_column"] = add_result_column
            restricted_globals["add_result_row"] = add_result_row

            restricted_globals["TYPE_DATETIME"] = TYPE_DATETIME
            restricted_globals["TYPE_BOOLEAN"] = TYPE_BOOLEAN
            restricted_globals["TYPE_INTEGER"] = TYPE_INTEGER
            restricted_globals["TYPE_STRING"] = TYPE_STRING
            restricted_globals["TYPE_DATE"] = TYPE_DATE
            restricted_globals["TYPE_FLOAT"] = TYPE_FLOAT

            # TODO: Figure out the best way to have a timeout on a script
            #       One option is to use ETA with Celery + timeouts on workers
            #       And replacement of worker process every X requests handled.

            exec(code) in restricted_globals, script_locals

            if script_locals['result'] is None:
                raise Exception("result wasn't set to value.")

            json_data = json.dumps(script_locals['result'])
        except KeyboardInterrupt:
            error = "Query cancelled by user."
            json_data = None
        except Exception as e:
            raise sys.exc_info()[1], None, sys.exc_info()[2]

        return json_data, error


register(Python)
