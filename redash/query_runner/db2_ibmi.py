import logging
import re

from redash.query_runner import *
from redash.query_runner.db2 import types_map
from redash.utils import json_dumps, json_loads

logger = logging.getLogger(__name__)

try:
    import select
    import pyodbc

    enabled = True
except ImportError:
    enabled = False


class DB2ForIBMI(BaseSQLQueryRunner):
    noop_query = "SELECT 1 FROM SYSIBM.SYSDUMMY1"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "user": {"type": "string"},
                "password": {"type": "string"},
                "host": {"type": "string", "default": "127.0.0.1"},
                "port": {"type": "number", "default": 8471},
                "database": {"type": "string", "title": "Database"},
                "other_libraries": {"type": "string", "title": "Additional libraries/schemas (comma separated)"},
            },
            "order": ["host", "port", "user", "password", "database", 'other_libraries'],
            "required": ["host", "user", "password", "database"],
            "secret": ["password"],
        }

    @classmethod
    def type(cls):
        return "db2_ibmi"

    @classmethod
    def enabled(cls):
        return enabled
    
    @classmethod
    def name(cls):
        return "DB2 for IBM i (ODBC)"

    def _get_filtered_schemas(self):
        schemas = [self.configuration.get("database")]

        additional_schemas = self.configuration.get("other_libraries", None)
        if additional_schemas:
            schemas = schemas + [re.sub("[^a-zA-Z0-9_.`]", "", additional_schema) 
                                 for additional_schema in additional_schemas.split(",")]
        
        return schemas

    def _get_definitions(self, schema, query):
        results, error = self.run_query(query, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json_loads(results)

        for row in results["rows"]:
            if row["TABLE_SCHEMA"] != self.configuration["database"]:
                table_name = "{}.{}".format(row["TABLE_SCHEMA"], row["TABLE_NAME"])
            else:
                table_name = row["TABLE_NAME"]

            if table_name not in schema:
                schema[table_name] = {"name": table_name, "columns": []}

            schema[table_name]["columns"].append(row["COLUMN_NAME"])

    def _get_tables(self, schema):
        schemas = self._get_filtered_schemas()

        query = """
        SELECT
        T.TABLE_SCHEMA AS table_schema,
        T.TABLE_NAME AS table_name,
        C.COLUMN_NAME AS column_name
        FROM QSYS2.SYSTABLES T
        JOIN QSYS2.SYSCOLUMNS C 
            ON T.TABLE_SCHEMA = C.TABLE_SCHEMA 
            AND T.TABLE_NAME = C.TABLE_NAME
        WHERE T.TABLE_TYPE IN ('T', 'V', 'P')
        AND T.SYSTEM_TABLE != 'Y'
        AND T.TABLE_SCHEMA NOT IN ('SYSIBM')
        AND T.TABLE_SCHEMA IN ({})
        """.format(", ".join(["'{}'".format(s) for s in schemas]))

        self._get_definitions(schema, query)

        return list(schema.values())

    def _get_connection(self):
        self.connection_string = "DRIVER={{IBM i Access ODBC Driver 64-bit}};DATABASE={};SYSTEM={};PORT={};PROTOCOL=TCPIP;UID={};PWD={};".format(
            self.configuration["database"],
            self.configuration["host"],
            self.configuration.get("port", 8471),
            self.configuration["user"],
            self.configuration["password"]
        )

        self.connection_string += 'DBQ={};'.format(self.configuration["database"])

        self.connection_string += "TRANSLATE=1;"

        connection = pyodbc.connect(self.connection_string)

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
        except pyodbc.DatabaseError as e:
            error = str(e)
            json_data = None
        except (KeyboardInterrupt, InterruptException, JobTimeoutException):
            connection.cancel()
            raise
        finally:
            connection.close()

        return json_data, error


register(DB2ForIBMI)
