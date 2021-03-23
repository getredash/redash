import logging

from redash.query_runner import *
from redash.utils import json_dumps

logger = logging.getLogger(__name__)

try:
    import tdclient
    from tdclient import errors

    enabled = True

except ImportError:
    enabled = False

TD_TYPES_MAPPING = {
    "bigint": TYPE_INTEGER,
    "tinyint": TYPE_INTEGER,
    "smallint": TYPE_INTEGER,
    "int": TYPE_INTEGER,
    "integer": TYPE_INTEGER,
    "long": TYPE_INTEGER,
    "double": TYPE_FLOAT,
    "decimal": TYPE_FLOAT,
    "float": TYPE_FLOAT,
    "real": TYPE_FLOAT,
    "boolean": TYPE_BOOLEAN,
    "timestamp": TYPE_DATETIME,
    "date": TYPE_DATETIME,
    "char": TYPE_STRING,
    "string": TYPE_STRING,
    "varchar": TYPE_STRING,
}


class TreasureData(BaseQueryRunner):
    should_annotate_query = False
    noop_query = "SELECT 1"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "endpoint": {"type": "string"},
                "apikey": {"type": "string"},
                "type": {"type": "string"},
                "db": {"type": "string", "title": "Database Name"},
                "get_schema": {
                    "type": "boolean",
                    "title": "Auto Schema Retrieval",
                    "default": False,
                },
            },
            "secret": ["apikey"],
            "required": ["apikey", "db"],
        }

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def type(cls):
        return "treasuredata"

    def get_schema(self, get_stats=False):
        schema = {}
        if self.configuration.get("get_schema", False):
            try:
                with tdclient.Client(self.configuration.get("apikey"),endpoint=self.configuration.get("endpoint")) as client:
                    for table in client.tables(self.configuration.get("db")):
                        table_name = "{}.{}".format(
                            self.configuration.get("db"), table.name
                        )
                        for table_schema in table.schema:
                            schema[table_name] = {
                                "name": table_name,
                                "columns": [column[0] for column in table.schema],
                            }
            except Exception as ex:
                raise Exception("Failed getting schema")
        return list(schema.values())

    def run_query(self, query, user):
        connection = tdclient.connect(
            endpoint=self.configuration.get("endpoint", "https://api.treasuredata.com"),
            apikey=self.configuration.get("apikey"),
            type=self.configuration.get("type", "hive").lower(),
            db=self.configuration.get("db"),
        )

        cursor = connection.cursor()
        try:
            cursor.execute(query)
            columns_tuples = [
                (i[0], TD_TYPES_MAPPING.get(i[1], None))
                for i in cursor.show_job()["hive_result_schema"]
            ]
            columns = self.fetch_columns(columns_tuples)

            if cursor.rowcount == 0:
                rows = []
            else:
                rows = [
                    dict(zip(([column["name"] for column in columns]), r))
                    for r in cursor.fetchall()
                ]
            data = {"columns": columns, "rows": rows}
            json_data = json_dumps(data)
            error = None
        except errors.InternalError as e:
            json_data = None
            error = "%s: %s" % (
                str(e),
                cursor.show_job()
                .get("debug", {})
                .get("stderr", "No stderr message in the response"),
            )
        return json_data, error


register(TreasureData)
