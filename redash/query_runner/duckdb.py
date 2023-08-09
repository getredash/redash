import logging
import duckdb
from redash.query_runner import BaseSQLQueryRunner, register, JobTimeoutException
from redash.utils import json_dumps, json_loads

logger = logging.getLogger(__name__)

class Duckdb(BaseSQLQueryRunner):
    noop_query = "PRAGMA show_tables"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {"dbpath": {"type": "string", "title": "Database Path"}},
            "required": ["dbpath"],
        }

    @classmethod
    def type(cls):
        return "duckdb"

    def __init__(self, configuration):
        super(Duckdb, self).__init__(configuration)
        self._dbpath = self.configuration["dbpath"]
        
        
    def _get_tables(self, schema):
        query_table = "SHOW ALL TABLE"
        query_columns = "PRAGMA table_info(\"%s\")"

        results, error = self.run_query(query_table, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json_loads(results)

        for row in results["rows"]:
            table_name = row["tbl_name"]
            schema[table_name] = {"name": table_name, "columns": []}
            results_table, error = self.run_query(query_columns % (table_name,), None)
            if error is not None:
                self._handle_run_query_error(error)

            results_table = json_loads(results_table)
            for row_column in results_table["rows"]:
                schema[table_name]["columns"].append(row_column["name"])

        return list(schema.values())
    def get_schema(self, get_stats=False):
        query = """
        SELECT TABLE_NAME,
               COLUMN_NAME,DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA <> 'INFORMATION_SCHEMA'
        """
        
        results, error = self.run_query(query, None)

        if error is not None:
            self._handle_run_query_error(error)

        schema = {}
        results = json_loads(results)
        for row in results["rows"]:
            table_name = row.get("table_name")
            table_name = table_name.upper()
            data_type = row.get("data_type")
            if table_name not in schema:
                 
                 schema[table_name] = {"name": table_name, "columns": []}
            
            column_name = row.get("column_name")

            schema[table_name]["columns"].append(str(column_name+" ("+data_type+ " )"))
        
        return list(schema.values())
    def run_query(self, query, user):
        
        dbpath = self.configuration.get('dbpath',None)
        connection = duckdb.connect(dbpath)
        cursor = connection.cursor()
        try:
            cursor.execute(query)

            if cursor.description is not None:
                columns = self.fetch_columns([(i[0], None) for i in cursor.description])
                rows = [
                    dict(zip((column["name"] for column in columns), row))
                    for row in cursor.fetchall()
                ]

                data = {"columns": columns, "rows": rows}
                error = None
                
                json_data = json_dumps(data)

            else:
                error = "Query completed but it returned no data."
                json_data = None
        except (KeyboardInterrupt, JobTimeoutException):
            connection.cancel()
            raise
        finally:
            connection.close()
        return json_data, error


register(Duckdb)