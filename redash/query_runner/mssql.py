import datetime
import decimal
import logging
import uuid

from redash.query_runner import (
    TYPE_BOOLEAN,
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
    import mssql_python

    enabled = True
except ImportError:
    enabled = False

# mssql-python reports the Python type of each column in cursor.description
types_map = {
    str: TYPE_STRING,
    bool: TYPE_BOOLEAN,
    int: TYPE_INTEGER,
    float: TYPE_FLOAT,
    decimal.Decimal: TYPE_FLOAT,
    datetime.datetime: TYPE_DATETIME,
    datetime.date: TYPE_DATE,
    datetime.time: TYPE_STRING,
    uuid.UUID: TYPE_STRING,
    bytes: TYPE_STRING,
}


class SqlServer(BaseSQLQueryRunner):
    should_annotate_query = False
    noop_query = "SELECT 1"

    limit_query = " TOP 1000"
    limit_keywords = ["TOP"]
    limit_after_select = True

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "user": {"type": "string"},
                "password": {"type": "string"},
                "server": {"type": "string", "default": "127.0.0.1"},
                "port": {"type": "number", "default": 1433},
                "db": {"type": "string", "title": "Database Name"},
                "use_ssl": {
                    "type": "boolean",
                    "title": "Use SSL",
                    "default": False,
                },
                "verify_ssl": {
                    "type": "boolean",
                    "title": "Verify SSL certificate",
                    "default": False,
                },
            },
            "order": ["server", "port", "user", "password", "db", "use_ssl", "verify_ssl"],
            "required": ["db"],
            "secret": ["password"],
            "extra_options": ["use_ssl", "verify_ssl"],
        }

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def name(cls):
        return "Microsoft SQL Server"

    @classmethod
    def type(cls):
        return "mssql"

    def _get_tables(self, schema):
        query = """
        SELECT table_schema, table_name, column_name
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE table_schema NOT IN ('guest','INFORMATION_SCHEMA','sys','db_owner','db_accessadmin'
                                  ,'db_securityadmin','db_ddladmin','db_backupoperator','db_datareader'
                                  ,'db_datawriter','db_denydatareader','db_denydatawriter'
                                  );
        """

        results, error = self.run_query(query, None)

        if error is not None:
            self._handle_run_query_error(error)

        for row in results["rows"]:
            if row["table_schema"] != self.configuration["db"]:
                table_name = "{}.{}".format(row["table_schema"], row["table_name"])
            else:
                table_name = row["table_name"]

            if table_name not in schema:
                schema[table_name] = {"name": table_name, "columns": []}

            schema[table_name]["columns"].append(row["column_name"])

        return list(schema.values())

    def _connection_params(self):
        server = self.configuration.get("server", "")
        port = int(self.configuration.get("port") or 1433)

        # Only pass the port when it isn't the default, so named instances
        # (HOST\INSTANCE) can still be resolved through SQL Server Browser.
        if port != 1433:
            server = "{},{}".format(server, port)

        params = {
            "server": server,
            "database": self.configuration["db"],
            "uid": self.configuration.get("user", ""),
            "pwd": self.configuration.get("password", ""),
        }

        if self.configuration.get("use_ssl", False):
            params["encrypt"] = "yes"
            params["trustservercertificate"] = "no" if self.configuration.get("verify_ssl", False) else "yes"
        else:
            # Neither FreeTDS (pymssql) nor the previous ODBC runner verified
            # the server certificate by default; keep that behavior for servers
            # that force encryption.
            params["encrypt"] = "no"
            params["trustservercertificate"] = "yes"

        return params

    def run_query(self, query, user):
        connection = None

        try:
            connection = mssql_python.connect(autocommit=True, **self._connection_params())

            cursor = connection.cursor()
            logger.debug("SqlServer running query: %s", query)

            cursor.execute(query)
            data = cursor.fetchall()

            if cursor.description is not None:
                columns = self.fetch_columns([(i[0], types_map.get(i[1], None)) for i in cursor.description])
                rows = [dict(zip((column["name"] for column in columns), row)) for row in data]

                data = {"columns": columns, "rows": rows}
                error = None
            else:
                error = "No data was returned."
                data = None

            cursor.close()
        except mssql_python.Error as e:
            error = getattr(e, "ddbc_error", None) or str(e)
            data = None
        except (KeyboardInterrupt, JobTimeoutException):
            # mssql-python has no cancel(); closing the connection (below) aborts the query.
            raise
        finally:
            if connection:
                connection.close()

        return data, error


register(SqlServer)
