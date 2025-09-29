import logging

from redash.query_runner import (
    TYPE_BOOLEAN,
    TYPE_DATE,
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
    BaseSQLQueryRunner,
    InterruptException,
    register,
)
from redash.utils import json_loads

logger = logging.getLogger(__name__)

try:
    import duckdb

    enabled = True
except ImportError:
    enabled = False

# Map DuckDB types to Redash column types
TYPES_MAP = {
    "BOOLEAN": TYPE_BOOLEAN,
    "TINYINT": TYPE_INTEGER,
    "SMALLINT": TYPE_INTEGER,
    "INTEGER": TYPE_INTEGER,
    "BIGINT": TYPE_INTEGER,
    "HUGEINT": TYPE_INTEGER,
    "REAL": TYPE_FLOAT,
    "DOUBLE": TYPE_FLOAT,
    "DECIMAL": TYPE_FLOAT,
    "VARCHAR": TYPE_STRING,
    "BLOB": TYPE_STRING,
    "DATE": TYPE_DATE,
    "TIMESTAMP": TYPE_DATETIME,
    "TIMESTAMP WITH TIME ZONE": TYPE_DATETIME,
    "TIME": TYPE_DATETIME,
    "INTERVAL": TYPE_STRING,
    "UUID": TYPE_STRING,
    "JSON": TYPE_STRING,
    "STRUCT": TYPE_STRING,
    "MAP": TYPE_STRING,
    "UNION": TYPE_STRING,
}


class DuckDB(BaseSQLQueryRunner):
    noop_query = "SELECT 1"

    def __init__(self, configuration):
        super().__init__(configuration)
        self.dbpath = configuration.get("dbpath", ":memory:")
        exts = configuration.get("extensions", "")
        self.extensions = [e.strip() for e in exts.split(",") if e.strip()]
        self._connect()

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "dbpath": {
                    "type": "string",
                    "title": "Database Path",
                    "default": ":memory:",
                },
                "extensions": {"type": "string", "title": "Extensions (comma separated)"},
            },
            "order": ["dbpath", "extensions"],
            "required": ["dbpath"],
        }

    @classmethod
    def enabled(cls) -> bool:
        return enabled

    def _connect(self) -> None:
        self.con = duckdb.connect(self.dbpath)
        for ext in self.extensions:
            try:
                self.con.execute(f"INSTALL {ext}")
                self.con.execute(f"LOAD {ext}")
            except Exception as e:
                logger.warning("Failed to load extension %s: %s", ext, e)

    def run_query(self, query, user) -> tuple:
        try:
            cursor = self.con.cursor()
            cursor.execute(query)
            columns = self.fetch_columns(
                [(d[0], TYPES_MAP.get(d[1].upper(), TYPE_STRING)) for d in cursor.description]
            )
            rows = [dict(zip((col["name"] for col in columns), row)) for row in cursor.fetchall()]
            data = {"columns": columns, "rows": rows}
            return data, None
        except duckdb.duckdb.InterruptException:
            raise InterruptException("Query cancelled by user.")
        except Exception as e:
            logger.exception("Error running query: %s", e)
            return None, str(e)

    def get_schema(self, get_stats=False) -> list:
        tables_query = """
            SELECT table_schema, table_name FROM information_schema.tables
            WHERE table_schema NOT IN ('information_schema', 'pg_catalog');
        """
        tables_results, error = self.run_query(tables_query, None)
        if error:
            raise Exception(f"Failed to get tables: {error}")

        schema = {}
        for table_row in tables_results["rows"]:
            full_table_name = f"{table_row['table_schema']}.{table_row['table_name']}"
            schema[full_table_name] = {"name": full_table_name, "columns": []}

            # Run a DESCRIBE query for each table.
            # It is an N+1 problem but necessary for exctracting struct fields as columns for autocomplete.
            describe_query = f"DESCRIBE \"{table_row['table_schema']}\".\"{table_row['table_name']}\";"
            columns_results, error = self.run_query(describe_query, None)
            if error:
                logger.warning("Failed to describe table %s: %s", full_table_name, error)
                continue

            for col_row in columns_results["rows"]:
                # DESCRIBE returns 'column_name' and 'column_type'
                schema[full_table_name]["columns"].append(
                    {"name": col_row["column_name"], "type": col_row["column_type"]}
                )

        return list(schema.values())

    def _expand_struct(self, schema_name, table_name, column_name, schema) -> None:
        try:
            describe_query = f'DESCRIBE "{schema_name}"."{table_name}"'
            results, error = self.run_query(describe_query, None)
            if error is not None:
                return
            results = json_loads(results)

            for r in results["rows"]:
                if r["column_name"] == column_name and r["column_type"].startswith("STRUCT"):
                    fields = r["column_type"][len("STRUCT(") : -1].split(",")
                    for f in fields:
                        fname, ftype = f.strip().split(" ")
                        schema[f"{schema_name}.{table_name}"]["columns"].append(
                            {"name": f"{column_name}.{fname}", "type": ftype}
                        )
        except Exception as e:
            logger.warning("Failed to expand struct column %s.%s.%s: %s", schema_name, table_name, column_name, e)


register(DuckDB)
