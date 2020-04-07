import datetime

from redash.query_runner import *
from redash.utils import json_dumps


def _exasol_type_mapper(val, data_type):
    if val is None:
        return None
    elif data_type["type"] == "DECIMAL":
        if data_type["scale"] == 0 and data_type["precision"] < 16:
            return int(val)
        elif data_type["scale"] == 0 and data_type["precision"] >= 16:
            return val
        else:
            return float(val)
    elif data_type["type"] == "DATE":
        return datetime.date(int(val[0:4]), int(val[5:7]), int(val[8:10]))
    elif data_type["type"] == "TIMESTAMP":
        return datetime.datetime(
            int(val[0:4]),
            int(val[5:7]),
            int(val[8:10]),  # year, month, day
            int(val[11:13]),
            int(val[14:16]),
            int(val[17:19]),  # hour, minute, second
            int(val[20:26].ljust(6, "0")) if len(val) > 20 else 0,
        )  # microseconds (if available)
    else:
        return val


def _type_mapper(data_type):
    if data_type["type"] == "DECIMAL":
        if data_type["scale"] == 0 and data_type["precision"] < 16:
            return TYPE_INTEGER
        elif data_type["scale"] == 0 and data_type["precision"] >= 16:
            return TYPE_STRING
        else:
            return TYPE_FLOAT
    elif data_type["type"] == "DATE":
        return TYPE_DATE
    elif data_type["type"] == "TIMESTAMP":
        return TYPE_DATETIME
    else:
        return TYPE_STRING


try:
    import pyexasol

    enabled = True
except ImportError:
    enabled = False


class Exasol(BaseQueryRunner):
    noop_query = "SELECT 1 FROM DUAL"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "user": {"type": "string"},
                "password": {"type": "string"},
                "host": {"type": "string"},
                "port": {"type": "number", "default": 8563},
            },
            "required": ["host", "port", "user", "password"],
            "order": ["host", "port", "user", "password"],
            "secret": ["password"],
        }

    def _get_connection(self):
        exahost = "%s:%s" % (
            self.configuration.get("host", None),
            self.configuration.get("port", 8563),
        )
        return pyexasol.connect(
            dsn=exahost,
            user=self.configuration.get("user", None),
            password=self.configuration.get("password", None),
            compression=True,
            json_lib="rapidjson",
            fetch_mapper=_exasol_type_mapper,
        )

    def run_query(self, query, user):
        connection = self._get_connection()
        statement = None
        error = None
        try:
            statement = connection.execute(query)
            columns = [
                {"name": n, "friendly_name": n, "type": _type_mapper(t)}
                for (n, t) in statement.columns().items()
            ]
            cnames = statement.column_names()

            rows = [dict(zip(cnames, row)) for row in statement]
            data = {"columns": columns, "rows": rows}
            json_data = json_dumps(data)
        finally:
            if statement is not None:
                statement.close()

            connection.close()

        return json_data, error

    def get_schema(self, get_stats=False):
        query = """
        SELECT
            COLUMN_SCHEMA,
            COLUMN_TABLE,
            COLUMN_NAME
        FROM EXA_ALL_COLUMNS
        """

        connection = self._get_connection()
        statement = None
        try:
            statement = connection.execute(query)
            result = {}

            for (schema, table_name, column) in statement:
                table_name_with_schema = "%s.%s" % (schema, table_name)

                if table_name_with_schema not in result:
                    result[table_name_with_schema] = {
                        "name": table_name_with_schema,
                        "columns": [],
                    }

                result[table_name_with_schema]["columns"].append(column)
        finally:
            if statement is not None:
                statement.close()

            connection.close()

        return result.values()

    @classmethod
    def enabled(cls):
        return enabled


register(Exasol)
