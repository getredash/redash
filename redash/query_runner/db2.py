import logging

from redash.query_runner import *
from redash.utils import json_dumps, json_loads

logger = logging.getLogger(__name__)

try:
    import select
    import ibm_db_dbi

    types_map = {
        ibm_db_dbi.NUMBER: TYPE_INTEGER,
        ibm_db_dbi.BIGINT: TYPE_INTEGER,
        ibm_db_dbi.ROWID: TYPE_INTEGER,
        ibm_db_dbi.FLOAT: TYPE_FLOAT,
        ibm_db_dbi.DECIMAL: TYPE_FLOAT,
        ibm_db_dbi.DATE: TYPE_DATE,
        ibm_db_dbi.TIME: TYPE_DATETIME,
        ibm_db_dbi.DATETIME: TYPE_DATETIME,
        ibm_db_dbi.BINARY: TYPE_STRING,
        ibm_db_dbi.XML: TYPE_STRING,
        ibm_db_dbi.TEXT: TYPE_STRING,
        ibm_db_dbi.STRING: TYPE_STRING,
    }

    enabled = True
except ImportError:
    enabled = False


class DB2(BaseSQLQueryRunner):
    noop_query = "SELECT 1 FROM SYSIBM.SYSDUMMY1"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "user": {"type": "string"},
                "password": {"type": "string"},
                "host": {"type": "string", "default": "127.0.0.1"},
                "port": {"type": "number", "default": 50000},
                "dbname": {"type": "string", "title": "Database Name"},
            },
            "order": ["host", "port", "user", "password", "dbname"],
            "required": ["dbname"],
            "secret": ["password"],
        }

    @classmethod
    def type(cls):
        return "db2"

    @classmethod
    def enabled(cls):
        try:
            import ibm_db
        except ImportError:
            return False

        return True

    def _get_definitions(self, schema, query):
        results, error = self.run_query(query, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json_loads(results)

        for row in results["rows"]:
            if row["TABLE_SCHEMA"] != "public":
                table_name = "{}.{}".format(row["TABLE_SCHEMA"], row["TABLE_NAME"])
            else:
                table_name = row["TABLE_NAME"]

            if table_name not in schema:
                schema[table_name] = {"name": table_name, "columns": []}

            schema[table_name]["columns"].append(row["COLUMN_NAME"])

    def _get_tables(self, schema):
        query = """
        SELECT rtrim(t.TABSCHEMA) as table_schema,
               t.TABNAME as table_name,
               c.COLNAME as column_name
        from syscat.tables t
        join syscat.columns c
        on t.TABSCHEMA = c.TABSCHEMA AND t.TABNAME = c.TABNAME
        WHERE t.type IN ('T') and t.TABSCHEMA not in ('SYSIBM')
        """
        self._get_definitions(schema, query)

        return list(schema.values())

    def _get_connection(self):
        self.connection_string = "DATABASE={};HOSTNAME={};PORT={};PROTOCOL=TCPIP;UID={};PWD={};".format(
            self.configuration["dbname"],
            self.configuration["host"],
            self.configuration["port"],
            self.configuration["user"],
            self.configuration["password"],
        )
        connection = ibm_db_dbi.connect(self.connection_string, "", "")

        return connection

    def run_query(self, query, user):
        connection = self._get_connection()
        cursor = connection.cursor()

        try:
            cursor.execute(query)

            if cursor.description is not None:
                columns = self.fetch_columns(
                    [(i[0], types_map.get(i[1], None)) for i in cursor.description]
                )
                rows = [
                    dict(zip((column["name"] for column in columns), row))
                    for row in cursor
                ]

                data = {"columns": columns, "rows": rows}
                error = None
                json_data = json_dumps(data)
            else:
                error = "Query completed but it returned no data."
                json_data = None
        except (select.error, OSError) as e:
            error = "Query interrupted. Please retry."
            json_data = None
        except ibm_db_dbi.DatabaseError as e:
            error = str(e)
            json_data = None
        except (KeyboardInterrupt, InterruptException):
            connection.cancel()
            error = "Query cancelled by user."
            json_data = None
        finally:
            connection.close()

        return json_data, error


register(DB2)
