import logging

from redash.query_runner import (
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_STRING,
    BaseSQLQueryRunner,
    JobTimeoutException,
    register,
)

logger = logging.getLogger(__name__)

try:
    import pymssql

    enabled = True
except ImportError:
    enabled = False

# from _mssql.pyx ## DB-API type definitions & http://www.freetds.org/tds.html#types ##
types_map = {
    1: TYPE_STRING,
    2: TYPE_STRING,
    # Type #3 supposed to be an integer, but in some cases decimals are returned
    # with this type. To be on safe side, marking it as float.
    3: TYPE_FLOAT,
    4: TYPE_DATETIME,
    5: TYPE_FLOAT,
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
                "tds_version": {
                    "type": "string",
                    "default": "7.0",
                    "title": "TDS Version",
                },
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

    def run_query(self, query, user):
        connection = None

        try:
            server = self.configuration.get("server", "")
            user = self.configuration.get("user", "")
            password = self.configuration.get("password", "")
            db = self.configuration["db"]
            port = self.configuration.get("port", 1433)
            tds_version = self.configuration.get("tds_version", "7.0")
            charset = self.configuration.get("charset", "UTF-8")

            if port != 1433:
                server = server + ":" + str(port)

            connection = pymssql.connect(
                server=server,
                user=user,
                password=password,
                database=db,
                tds_version=tds_version,
                charset=charset,
            )

            if isinstance(query, str):
                query = query.encode(charset)

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
            connection.commit()
        except pymssql.Error as e:
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


register(SqlServer)
