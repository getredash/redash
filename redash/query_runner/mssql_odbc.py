import logging

from redash.query_runner import (
    BaseSQLQueryRunner,
    JobTimeoutException,
    register,
)
from redash.query_runner.mssql import types_map

logger = logging.getLogger(__name__)

try:
    import pyodbc

    enabled = True
except ImportError:
    enabled = False


class SQLServerODBC(BaseSQLQueryRunner):
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
                "server": {"type": "string"},
                "port": {"type": "number", "default": 1433},
                "user": {"type": "string"},
                "password": {"type": "string"},
                "db": {"type": "string", "title": "Database Name"},
                "charset": {
                    "type": "string",
                    "default": "UTF-8",
                    "title": "Character Set",
                },
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
            "order": [
                "server",
                "port",
                "user",
                "password",
                "db",
                "charset",
                "use_ssl",
                "verify_ssl",
            ],
            "required": ["server", "user", "password", "db"],
            "secret": ["password"],
            "extra_options": ["verify_ssl", "use_ssl"],
        }

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def name(cls):
        return "Microsoft SQL Server (ODBC)"

    @classmethod
    def type(cls):
        return "mssql_odbc"

    @property
    def supports_auto_limit(self):
        return False

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

    def run_query(self, query, user):
        connection = None

        try:
            server = self.configuration.get("server")
            user = self.configuration.get("user", "")
            password = self.configuration.get("password", "")
            db = self.configuration["db"]
            port = self.configuration.get("port", 1433)

            connection_params = {
                "Driver": "{ODBC Driver 18 for SQL Server}",
                "Server": server,
                "Port": port,
                "Database": db,
                "Uid": user,
                "Pwd": password,
            }

            if self.configuration.get("use_ssl", False):
                connection_params["Encrypt"] = "YES"

                if not self.configuration.get("verify_ssl"):
                    connection_params["TrustServerCertificate"] = "YES"
                else:
                    connection_params["TrustServerCertificate"] = "NO"
            else:
                connection_params["Encrypt"] = "NO"

            def fn(k):
                return "{}={}".format(k, connection_params[k])

            connection_string = ";".join(list(map(fn, connection_params)))

            connection = pyodbc.connect(connection_string)
            cursor = connection.cursor()
            logger.debug("SQLServerODBC running query: %s", query)
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
        except pyodbc.Error as e:
            try:
                # Query errors are at `args[1]`
                error = e.args[1]
            except IndexError:
                # Connection errors are `args[0][1]`
                error = e.args[0][1]
            data = None
        except (KeyboardInterrupt, JobTimeoutException):
            connection.cancel()
            raise
        finally:
            if connection:
                connection.close()

        return data, error


register(SQLServerODBC)
