from redash.query_runner import *
from redash.utils import json_dumps, json_loads

import logging

logger = logging.getLogger(__name__)

try:
    import phoenixdb
    from phoenixdb.errors import *

    enabled = True

except ImportError:
    enabled = False

TYPES_MAPPING = {
    "VARCHAR": TYPE_STRING,
    "CHAR": TYPE_STRING,
    "BINARY": TYPE_STRING,
    "VARBINARY": TYPE_STRING,
    "BOOLEAN": TYPE_BOOLEAN,
    "TIME": TYPE_DATETIME,
    "DATE": TYPE_DATETIME,
    "TIMESTAMP": TYPE_DATETIME,
    "UNSIGNED_TIME": TYPE_DATETIME,
    "UNSIGNED_DATE": TYPE_DATETIME,
    "UNSIGNED_TIMESTAMP": TYPE_DATETIME,
    "INTEGER": TYPE_INTEGER,
    "UNSIGNED_INT": TYPE_INTEGER,
    "BIGINT": TYPE_INTEGER,
    "UNSIGNED_LONG": TYPE_INTEGER,
    "TINYINT": TYPE_INTEGER,
    "UNSIGNED_TINYINT": TYPE_INTEGER,
    "SMALLINT": TYPE_INTEGER,
    "UNSIGNED_SMALLINT": TYPE_INTEGER,
    "FLOAT": TYPE_FLOAT,
    "UNSIGNED_FLOAT": TYPE_FLOAT,
    "DOUBLE": TYPE_FLOAT,
    "UNSIGNED_DOUBLE": TYPE_FLOAT,
    "DECIMAL": TYPE_FLOAT,
}


class Phoenix(BaseQueryRunner):
    noop_query = "select 1"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {"url": {"type": "string"}},
            "required": ["url"],
        }

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def type(cls):
        return "phoenix"

    def get_schema(self, get_stats=False):
        schema = {}
        query = """
        SELECT TABLE_SCHEM, TABLE_NAME, COLUMN_NAME
        FROM SYSTEM.CATALOG
        WHERE TABLE_SCHEM IS NULL OR TABLE_SCHEM != 'SYSTEM' AND COLUMN_NAME IS NOT NULL
        """

        results, error = self.run_query(query, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json_loads(results)

        for row in results["rows"]:
            table_name = "{}.{}".format(row["TABLE_SCHEM"], row["TABLE_NAME"])

            if table_name not in schema:
                schema[table_name] = {"name": table_name, "columns": []}

            schema[table_name]["columns"].append(row["COLUMN_NAME"])

        return list(schema.values())

    def run_query(self, query, user):
        connection = phoenixdb.connect(
            url=self.configuration.get("url", ""), autocommit=True
        )

        cursor = connection.cursor()

        try:
            cursor.execute(query)
            column_tuples = [
                (i[0], TYPES_MAPPING.get(i[1], None)) for i in cursor.description
            ]
            columns = self.fetch_columns(column_tuples)
            rows = [
                dict(zip(([column["name"] for column in columns]), r))
                for i, r in enumerate(cursor.fetchall())
            ]
            data = {"columns": columns, "rows": rows}
            json_data = json_dumps(data)
            error = None
            cursor.close()
        except Error as e:
            json_data = None
            error = "code: {}, sql state:{}, message: {}".format(
                e.code, e.sqlstate, str(e)
            )
        except (KeyboardInterrupt, InterruptException) as e:
            error = "Query cancelled by user."
            json_data = None
        except Exception as ex:
            json_data = None
            error = str(ex)
        finally:
            if connection:
                connection.close()

        return json_data, error


register(Phoenix)
