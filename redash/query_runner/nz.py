import logging
import traceback

from redash.query_runner import (
    TYPE_BOOLEAN,
    TYPE_DATE,
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
    BaseSQLQueryRunner,
    register,
)

logger = logging.getLogger(__name__)

try:
    import nzpy
    import nzpy.core

    _enabled = True
    _nztypes = {
        nzpy.core.NzTypeInt1: TYPE_INTEGER,
        nzpy.core.NzTypeInt2: TYPE_INTEGER,
        nzpy.core.NzTypeInt: TYPE_INTEGER,
        nzpy.core.NzTypeInt8: TYPE_INTEGER,
        nzpy.core.NzTypeBool: TYPE_BOOLEAN,
        nzpy.core.NzTypeDate: TYPE_DATE,
        nzpy.core.NzTypeTimestamp: TYPE_DATETIME,
        nzpy.core.NzTypeDouble: TYPE_FLOAT,
        nzpy.core.NzTypeFloat: TYPE_FLOAT,
        nzpy.core.NzTypeChar: TYPE_STRING,
        nzpy.core.NzTypeNChar: TYPE_STRING,
        nzpy.core.NzTypeNVarChar: TYPE_STRING,
        nzpy.core.NzTypeVarChar: TYPE_STRING,
        nzpy.core.NzTypeVarFixedChar: TYPE_STRING,
        nzpy.core.NzTypeNumeric: TYPE_FLOAT,
    }

    _cat_types = {
        16: TYPE_BOOLEAN,  # boolean
        17: TYPE_STRING,  # bytea
        19: TYPE_STRING,  # name type
        20: TYPE_INTEGER,  # int8
        21: TYPE_INTEGER,  # int2
        23: TYPE_INTEGER,  # int4
        25: TYPE_STRING,  # TEXT type
        26: TYPE_INTEGER,  # oid
        28: TYPE_INTEGER,  # xid
        700: TYPE_FLOAT,  # float4
        701: TYPE_FLOAT,  # float8
        705: TYPE_STRING,  # unknown
        829: TYPE_STRING,  # MACADDR type
        1042: TYPE_STRING,  # CHAR type
        1043: TYPE_STRING,  # VARCHAR type
        1082: TYPE_DATE,  # date
        1083: TYPE_DATETIME,
        1114: TYPE_DATETIME,  # timestamp w/ tz
        1184: TYPE_DATETIME,
        1700: TYPE_FLOAT,  # NUMERIC
        2275: TYPE_STRING,  # cstring
        2950: TYPE_STRING,  # uuid
    }
except ImportError:
    _enabled = False
    _nztypes = {}
    _cat_types = {}


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
                "database": {"type": "string", "title": "Database Name", "default": "system"},
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
                host=self.configuration.get("host"),
                user=self.configuration.get("user"),
                password=self.configuration.get("password"),
                port=self.configuration.get("port"),
                database=self.configuration.get("database"),
            )
        return self._conn

    def get_schema(self, get_stats=False):
        qry = """
        select
            table_schema || '.' || table_name as table_name,
            column_name,
            data_type
        from
            columns
        where
            table_schema not in (^information_schema^, ^definition_schema^) and
            table_catalog = current_catalog;
        """
        schema = {}
        with self.connection.cursor() as cursor:
            cursor.execute(qry)
            for table_name, column_name, data_type in cursor:
                if table_name not in schema:
                    schema[table_name] = {"name": table_name, "columns": []}
                schema[table_name]["columns"].append({"name": column_name, "type": data_type})
            return list(schema.values())

    @classmethod
    def enabled(cls):
        global _enabled
        return _enabled

    def type_map(self, typid, func):
        global _nztypes, _cat_types
        typ = _nztypes.get(typid)
        if typ is None:
            return _cat_types.get(typid)
        # check for conflicts
        if typid == nzpy.core.NzTypeVarChar:
            return TYPE_BOOLEAN if "bool" in func.__name__ else typ

        if typid == nzpy.core.NzTypeInt2:
            return TYPE_STRING if "text" in func.__name__ else typ

        if typid in (nzpy.core.NzTypeVarFixedChar, nzpy.core.NzTypeVarBinary, nzpy.core.NzTypeNVarChar):
            return TYPE_INTEGER if "int" in func.__name__ else typ
        return typ

    def run_query(self, query, user):
        data, error = None, None
        try:
            with self.connection.cursor() as cursor:
                cursor.execute(query)
                if cursor.description is None:
                    columns = {"columns": [], "rows": []}
                else:
                    columns = self.fetch_columns(
                        [
                            (val[0], self.type_map(val[1], cursor.ps["row_desc"][i]["func"]))
                            for i, val in enumerate(cursor.description)
                        ]
                    )
                rows = [dict(zip((column["name"] for column in columns), row)) for row in cursor]

                data = {"columns": columns, "rows": rows}
        except Exception:
            error = traceback.format_exc()
        return data, error


register(Netezza)
