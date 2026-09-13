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
                "extensions": {
                    "type": "string",
                    "title": "Extensions (comma separated)",
                },
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
                if "." in ext:
                    prefix, name = ext.split(".", 1)
                    if prefix == "community":
                        self.con.execute(f"INSTALL {name} FROM community")
                        self.con.execute(f"LOAD {name}")
                    else:
                        raise Exception("Unknown extension prefix.")
                else:
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
        except duckdb.InterruptException:
            raise InterruptException("Query cancelled by user.")
        except Exception as e:
            logger.exception("Error running query: %s", e)
            return None, str(e)

    def get_schema(self, get_stats=False) -> list:
        tables_query = """
            SELECT table_catalog, table_schema, table_name FROM information_schema.tables
            WHERE table_schema NOT IN ('information_schema', 'pg_catalog');
        """
        tables_results, error = self.run_query(tables_query, None)
        if error:
            raise Exception(f"Failed to get tables: {error}")

        schema = {}
        for table_row in tables_results["rows"]:
            # Include catalog (database) in the full table name for MotherDuck support
            catalog = table_row["table_catalog"]
            schema_name = table_row["table_schema"]
            table_name = table_row["table_name"]

            # Skip catalog prefix for default local databases (memory, temp)
            # but include it for MotherDuck and attached databases
            if catalog.lower() in ("memory", "temp", "system"):
                full_table_name = f"{schema_name}.{table_name}"
                describe_query = f'DESCRIBE "{schema_name}"."{table_name}";'
            else:
                full_table_name = f"{catalog}.{schema_name}.{table_name}"
                describe_query = f'DESCRIBE "{catalog}"."{schema_name}"."{table_name}";'

            schema[full_table_name] = {"name": full_table_name, "columns": []}
            columns_results, error = self.run_query(describe_query, None)
            if error:
                logger.warning("Failed to describe table %s: %s", full_table_name, error)
                continue

            for col_row in columns_results["rows"]:
                col = {"name": col_row["column_name"], "type": col_row["column_type"]}
                schema[full_table_name]["columns"].append(col)

                if col_row["column_type"].startswith("STRUCT("):
                    schema[full_table_name]["columns"].extend(
                        self._expand_struct_fields(col["name"], col_row["column_type"])
                    )

        return list(schema.values())

    def _expand_struct_fields(self, base_name: str, struct_type: str) -> list:
        """Recursively expand STRUCT(...) definitions into pseudo-columns."""
        fields = []
        # strip STRUCT( ... )
        inner = struct_type[len("STRUCT(") : -1].strip()
        # careful: nested structs, so parse comma-separated parts properly
        depth, current, parts = 0, [], []
        for c in inner:
            if c == "(":
                depth += 1
            elif c == ")":
                depth -= 1
            if c == "," and depth == 0:
                parts.append("".join(current).strip())
                current = []
            else:
                current.append(c)
        if current:
            parts.append("".join(current).strip())

        for part in parts:
            # each part looks like: "fieldname TYPE"
            fname, ftype = part.split(" ", 1)
            colname = f"{base_name}.{fname}"
            fields.append({"name": colname, "type": ftype})
            if ftype.startswith("STRUCT("):
                fields.extend(self._expand_struct_fields(colname, ftype))
        return fields


register(DuckDB)
