import logging

from redash.query_runner import (
    TYPE_DATE,
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
    BaseSQLQueryRunner,
    JobTimeoutException,
    register,
)
from redash.utils import json_dumps, json_loads

logger = logging.getLogger(__name__)

try:
    import fdb

    enabled = True
except ImportError:
    enabled = False

types_map = {
    7: TYPE_FLOAT,
    8: TYPE_FLOAT,
    10: TYPE_FLOAT,
    12: TYPE_DATE,
    13: TYPE_DATETIME,
    14: TYPE_STRING,
    16: TYPE_FLOAT,
    27: TYPE_FLOAT,
    35: TYPE_INTEGER,
    37: TYPE_STRING,
    40: TYPE_STRING,
    45: TYPE_STRING,
}


class FirebirdRunner(BaseSQLQueryRunner):
    noop_query = "SELECT 1 FROM RDB$DATABASE;"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "user": {"type": "string"},
                "password": {"type": "string"},
                "server": {"type": "string", "default": "127.0.0.1"},
                "port": {"type": "number", "default": 3050},
                "charset": {
                    "type": "string",
                    "default": "UTF-8",
                    "title": "Character Set",
                },
                "db": {"type": "string", "title": "Database Name"},
            },
            "required": ["db"],
            "secret": ["password"],
        }

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def name(cls):
        return "Firebird"

    @classmethod
    def type(cls):
        return "firebird"

    def _get_tables(self, schema):
        query = """
        SELECT f.rdb$relation_name AS table_name
              ,f.rdb$field_name AS column_name
        FROM rdb$relation_fields f
        JOIN rdb$relations r ON f.rdb$relation_name = r.rdb$relation_name
                            AND r.rdb$view_blr IS NULL
                            AND (r.rdb$system_flag IS NULL OR r.rdb$system_flag = 0)
        ORDER BY 1, f.rdb$field_position;
        """

        results, error = self.run_query(query, None)

        if error is not None:
            self._handle_run_query_error(error)

        results = json_loads(results)

        for row in results["rows"]:
            table_name = row["table_name"]

            if table_name not in schema:
                schema[table_name] = {"name": table_name, "columns": []}

            schema[table_name]["columns"].append(row["column_name"])

        return list(schema.values())

    def run_query(self, query, user):
        connection = None

        try:
            server = self.configuration.get("server", "")
            user = self.configuration.get("user", "")
            password = self.configuration.get("password", "")
            db = self.configuration["db"]
            port = self.configuration.get("port", 3050)
            charset = self.configuration.get("charset", "UTF-8")

            if port != 3050:
                server = server + "/" + str(port)

            connection = fdb.connect(
                database=f"{server}:{db}",
                user=user,
                password=password,
                charset=charset,
            )

            if isinstance(query, str):
                query = query.encode(charset)

            cursor = connection.cursor()
            logger.debug("Firebird running query: %s", query)

            cursor.execute(query)
            data = cursor.fetchall()

            if cursor.description is not None:
                columns = self.fetch_columns([(i[0], types_map.get(i[1], None)) for i in cursor.description])
                rows = [dict(zip((column["name"] for column in columns), row)) for row in data]

                data = {"columns": columns, "rows": rows}
                json_data = json_dumps(data)
                error = None
            else:
                error = "No data was returned."
                json_data = None

            cursor.close()
            connection.commit()
        except fdb.Error as e:
            try:
                # Query errors are at `args[1]`
                error = e.args[1]
            except IndexError:
                # Connection errors are `args[0][1]`
                error = e.args[0][1]
            json_data = None
        except (KeyboardInterrupt, JobTimeoutException):
            connection.cancel()
            raise
        finally:
            if connection:
                connection.close()

        return json_data, error


register(FirebirdRunner)
