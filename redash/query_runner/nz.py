from dataclasses import dataclass
import logging
import traceback
import json

from redash.query_runner import *
from redash.utils import json_dumps, json_loads

logger = logging.getLogger(__name__)

try:
    import nzpy
    import nzpy.core
    _enabled = True
    _nztypes = {
        nzpy.core.NzTypeInt1 : TYPE_INTEGER,
        nzpy.core.NzTypeInt2 : TYPE_INTEGER,
        nzpy.core.NzTypeInt : TYPE_INTEGER,
        nzpy.core.NzTypeInt8 : TYPE_INTEGER,
        nzpy.core.NzTypeBool : TYPE_BOOLEAN,
        nzpy.core.NzTypeDate : TYPE_DATE,
        nzpy.core.NzTypeTimestamp : TYPE_DATETIME,
        nzpy.core.NzTypeDouble : TYPE_FLOAT, 
        nzpy.core.NzTypeFloat : TYPE_FLOAT, 
        nzpy.core.NzTypeChar : TYPE_STRING, 
        nzpy.core.NzTypeNChar : TYPE_STRING, 
        nzpy.core.NzTypeNVarChar : TYPE_STRING, 
        nzpy.core.NzTypeVarChar : TYPE_STRING, 
        nzpy.core.NzTypeVarFixedChar : TYPE_STRING, 
        nzpy.core.NzTypeNumeric : TYPE_FLOAT, 
    }
except:
    _enabled = False
    _nztypes = {}

class Netezza(BaseSQLQueryRunner):
    noop_query = "SELECT 1"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "user": {"type": "string"},
                "password": {"type": "string"},
                "host": {"type": "string", "default": "127.0.0.1"},
                "port": {"type": "number", "default": 5480},
                "database": {"type": "string", "title": "Database Name", "default":"system"},
            },
            "order": ["host", "port", "user", "password", "database"],
            "required": ["user", "password", "database"],
            "secret": ["password"],
        }

    @classmethod
    def type(cls):
        return "nz"

    def __init__(self, configuration):
        super().__init__(configuration)
        self._conn = None

    @property
    def connection(self):
        if self._conn is None:
            self._conn = nzpy.connect(
                host = self.configuration.get("host"),
                user = self.configuration.get("user"),
                password = self.configuration.get("password"),
                port = self.configuration.get("port"),
                database = self.configuration.get("database")
            )
        return self._conn

    def get_schema(self):
        qry = '''
        select
            table_schema || '.' || table_name as table_name,
            column_name,
            data_type
        from 
            columns
        where
            table_schema not in (^information_schema^, ^definition_schema^) and 
            table_catalog = current_catalog;
        '''
        schema = {}
        with self.connection.cursor() as cursor:
            cursor.execute(qry)
            for table_name, column_name, data_type in cursor:
                schema.setdefault(table_name, 
                                  {"name" : table_name, "columns":[]})["columns"].append(
                    {"name":column_name, "type": data_type})
            return list(schema.values())

    @classmethod
    def enabled(cls):
        global _enabled
        return _enabled

    def type_map(self, typid):
        global _nztypes
        return _nztypes.get(typid)

    def run_query(self, query, user):
        json_data, error = None, None
        try:
            with self.connection.cursor() as cursor:
                cursor.execute(query)
                columns = self.fetch_columns(
                    [(i[0], self.type_map(i[1])) for i in cursor.description]
                )
                rows = [
                    dict(zip((column["name"] for column in columns), row))
                    for row in cursor
                ]

                json_data = json.dumps({"columns": columns, "rows": rows})
        except:
            error = traceback.format_exc()
        return json_data, error

register(Netezza)