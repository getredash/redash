import datetime
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

logger = logging.getLogger(__name__)

try:
    import fdb

    enabled = True
except ImportError:
    enabled = False

types_map = {
    str: TYPE_STRING,
    int: TYPE_INTEGER,
    float: TYPE_FLOAT,
    datetime.date: TYPE_DATE,
    datetime.datetime: TYPE_DATETIME,
}


class firebird(BaseSQLQueryRunner):
    noop_query = "SELECT 1 FROM RDB$DATABASE;"

    limit_query = " FIRST 1000"
    limit_keywords = ["FIRST"]
    limit_after_select = True

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
        SELECT TRIM(f.rdb$relation_name) AS table_name
              ,TRIM(f.rdb$field_name) AS column_name
        FROM rdb$relation_fields f
        JOIN rdb$relations r ON f.rdb$relation_name = r.rdb$relation_name
                            AND r.rdb$view_blr IS NULL
                            AND (r.rdb$system_flag IS NULL OR r.rdb$system_flag = 0)
        ORDER BY 1, f.rdb$field_position;
        """

        results, error = self.run_query(query, None)

        if error is not None:
            self._handle_run_query_error(error)

        for row in results["rows"]:
            table_name = row["TABLE_NAME"]

            if table_name not in schema:
                schema[table_name] = {"name": table_name, "columns": []}

            schema[table_name]["columns"].append(row["COLUMN_NAME"])

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

            cursor.execute(query)
            data = cursor.fetchall()
            logging.info(f'firebird data: {data}')

            if cursor.description is not None:
                columns = self.fetch_columns([(i[0], types_map.get(i[1], None)) for i in cursor.description])
                rows = [dict(zip((column["name"] for column in columns), row)) for row in data]

                data = {"columns": columns, "rows": rows}
                error = None
            else:
                error = "No data was returned."
                data = None

            cursor.close()
            connection.commit()
        except fdb.Error as e:
            error = e.args[0]
            data = None
        except (KeyboardInterrupt, JobTimeoutException):
            connection.cancel()
            raise
        finally:
            if connection:
                connection.close()

        return data, error


register(firebird)
