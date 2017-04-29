import datetime
import json
import logging
import sys

from redash.query_runner import *
from redash.utils import json_dumps
from redash import models

import importlib

logger = logging.getLogger(__name__)

from RestrictedPython import compile_restricted
from RestrictedPython.Guards import safe_builtins


class CustomPrint(object):
    """CustomPrint redirect "print" calls to be sent as "log" on the result object."""
    def __init__(self):
        self.enabled = True
        self.lines = []

    def write(self, text):
        if self.enabled:
            if text and text.strip():
                log_line = "[{0}] {1}".format(datetime.datetime.utcnow().isoformat(), text)
                self.lines.append(log_line)

    def enable(self):
        self.enabled = True

    def disable(self):
        self.enabled = False

    def __call__(self):
        return self


class Python(BaseQueryRunner):
    safe_builtins = (
        'sorted', 'reversed', 'map', 'reduce', 'any', 'all',
        'slice', 'filter', 'len', 'next', 'enumerate',
        'sum', 'abs', 'min', 'max', 'round', 'cmp', 'divmod',
        'str', 'unicode', 'int', 'float', 'complex',
        'tuple', 'set', 'list', 'dict', 'bool',
    )

    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'allowedImportModules': {
                    'type': 'string',
                    'title': 'Modules to import prior to running the script'
                },
                'additionalModulesPaths' : {
                    'type' : 'string'
                }
            },
        }

    @classmethod
    def enabled(cls):
        return True

    @classmethod
    def annotate_query(cls):
        return False

    def __init__(self, configuration):
        super(Python, self).__init__(configuration)

        self.syntax = "python"

        self._allowed_modules = {}
        self._script_locals = {"result": {"rows": [], "columns": [], "log": []}}
        self._enable_print_log = True
        self._custom_print = CustomPrint()

        if self.configuration.get("allowedImportModules", None):
            for item in self.configuration["allowedImportModules"].split(","):
                self._allowed_modules[item] = None

        if self.configuration.get("additionalModulesPaths", None):
            for p in self.configuration["additionalModulesPaths"].split(","):
                if p not in sys.path:
                    sys.path.append(p)

    def custom_import(self, name, globals=None, locals=None, fromlist=(), level=0):
        if name in self._allowed_modules:
            m = None
            if self._allowed_modules[name] is None:
                m = importlib.import_module(name)
                self._allowed_modules[name] = m
            else:
                m = self._allowed_modules[name]

            return m

        raise Exception("'{0}' is not configured as a supported import module".format(name))

    @staticmethod
    def custom_write(obj):
        """
        Custom hooks which controls the way objects/lists/tuples/dicts behave in
        RestrictedPython
        """
        return obj

    @staticmethod
    def custom_get_item(obj, key):
        return obj[key]

    @staticmethod
    def custom_get_iter(obj):
        return iter(obj)

    @staticmethod
    def add_result_column(result, column_name, friendly_name, column_type):
        """Helper function to add columns inside a Python script running in Redash in an easier way

        Parameters:
        :result dict: The result dict
        :column_name string: Name of the column, which should be consisted of lowercase latin letters or underscore.
        :friendly_name string: Name of the column for display
        :column_type string: Type of the column. Check supported data types for details.
        """
        if column_type not in SUPPORTED_COLUMN_TYPES:
            raise Exception("'{0}' is not a supported column type".format(column_type))

        if "columns" not in result:
            result["columns"] = []

        result["columns"].append({
            "name": column_name,
            "friendly_name": friendly_name,
            "type": column_type
        })

    @staticmethod
    def add_result_row(result, values):
        """Helper function to add one row to results set.

        Parameters:
        :result dict: The result dict
        :values dict: One row of result in dict. The key should be one of the column names. The value is the value of the column in this row.
        """
        if "rows" not in result:
            result["rows"] = []

        result["rows"].append(values)

    @staticmethod
    def execute_query(data_source_name_or_id, query):
        """Run query from specific data source.

        Parameters:
        :data_source_name_or_id string|integer: Name or ID of the data source
        :query string: Query to run
        """
        try:
            if type(data_source_name_or_id) == int:
                data_source = models.DataSource.get_by_id(data_source_name_or_id)
            else:
                data_source = models.DataSource.get_by_name(data_source_name_or_id)
        except models.NoResultFound:
            raise Exception("Wrong data source name/id: %s." % data_source_name_or_id)

        # TODO: pass the user here...
        data, error = data_source.query_runner.run_query(query, None)
        if error is not None:
            raise Exception(error)

        # TODO: allow avoiding the json.dumps/loads in same process
        return json.loads(data)

    @staticmethod
    def get_source_schema(data_source_name_or_id):
        """Get schema from specific data source.

        :param data_source_name_or_id: string|integer: Name or ID of the data source
        :return:
        """
        try:
            if type(data_source_name_or_id) == int:
                data_source = models.DataSource.get_by_id(data_source_name_or_id)
            else:
                data_source = models.DataSource.get_by_name(data_source_name_or_id)
        except models.NoResultFound:
            raise Exception("Wrong data source name/id: %s." % data_source_name_or_id)
        schema = data_source.query_runner.get_schema()
        return schema

    @staticmethod
    def get_query_result(query_id):
        """Get result of an existing query.

        Parameters:
        :query_id integer: ID of existing query
        """
        try:
            query = models.Query.get_by_id(query_id)
        except models.NoResultFound:
            raise Exception("Query id %s does not exist." % query_id)

        if query.latest_query_data is None:
            raise Exception("Query does not have results yet.")

        if query.latest_query_data.data is None:
            raise Exception("Query does not have results yet.")

        return json.loads(query.latest_query_data.data)

    def test_connection(self):
        pass

    def run_query(self, query, user):
        try:
            error = None

            code = compile_restricted(query, '<string>', 'exec')

            builtins = safe_builtins.copy()
            builtins["_write_"] = self.custom_write
            builtins["__import__"] = self.custom_import
            builtins["_getattr_"] = getattr
            builtins["getattr"] = getattr
            builtins["_setattr_"] = setattr
            builtins["setattr"] = setattr
            builtins["_getitem_"] = self.custom_get_item
            builtins["_getiter_"] = self.custom_get_iter
            builtins["_print_"] = self._custom_print

            # Layer in our own additional set of builtins that we have
            # considered safe.
            for key in self.safe_builtins:
                builtins[key] = __builtins__[key]

            restricted_globals = dict(__builtins__=builtins)
            restricted_globals["get_query_result"] = self.get_query_result
            restricted_globals["get_source_schema"] = self.get_source_schema
            restricted_globals["execute_query"] = self.execute_query
            restricted_globals["add_result_column"] = self.add_result_column
            restricted_globals["add_result_row"] = self.add_result_row
            restricted_globals["disable_print_log"] = self._custom_print.disable
            restricted_globals["enable_print_log"] = self._custom_print.enable

            # Supported data types
            restricted_globals["TYPE_DATETIME"] = TYPE_DATETIME
            restricted_globals["TYPE_BOOLEAN"] = TYPE_BOOLEAN
            restricted_globals["TYPE_INTEGER"] = TYPE_INTEGER
            restricted_globals["TYPE_STRING"] = TYPE_STRING
            restricted_globals["TYPE_DATE"] = TYPE_DATE
            restricted_globals["TYPE_FLOAT"] = TYPE_FLOAT


            # TODO: Figure out the best way to have a timeout on a script
            #       One option is to use ETA with Celery + timeouts on workers
            #       And replacement of worker process every X requests handled.

            exec(code) in restricted_globals, self._script_locals

            result = self._script_locals['result']
            result['log'] = self._custom_print.lines
            json_data = json_dumps(result)
        except KeyboardInterrupt:
            error = "Query cancelled by user."
            json_data = None
        except Exception as e:
            error = str(type(e)) + " " + str(e)
            json_data = None

        return json_data, error


register(Python)
