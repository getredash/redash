import jaydebeapi as jdbc

from redash.query_runner import (
    TYPE_BOOLEAN,
    TYPE_INTEGER,
    TYPE_STRING,
    BaseSQLQueryRunner,
    register,
)

TYPES_MAP = {1: TYPE_STRING, 2: TYPE_INTEGER, 3: TYPE_BOOLEAN}


class JDBC(BaseSQLQueryRunner):
    noop_query = "SELECT 1"

    @classmethod
    def type(cls):
        return "jdbc"

    @classmethod
    def name(cls):
        return "JDBC"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "driver": {"type": "string", "title": "Driver class", "default": "com.hazelcast.jdbc.Driver"},
                "url": {"type": "string", "default": "hazelcast-headful:5701"},
                "properties": {"type": "string", "default": ""},
                "user": {"type": "string", "default": "user"},
                "password": {"type": "string", "default": "mysupersonicsecret"},
                "jars": {"type": "string", "default": "/jdbc/hazelcast-jdbc.jar"},
            },
            "order": ["driver", "url", "properties", "user", "password", "jars"],
            "required": ["driver", "url", "jars"],
        }

    def run_query(self, query, user):
        jdbc_class = self.configuration.get("driver") or None
        jars = self.configuration.get("jars") or None
        jdbc_url = self.configuration.get("url")

        # Add properties (if any)
        if self.configuration.get("properties"):
            jdbc_url += "/?" + (self.configuration.get("properties"))

        driver_args = {
            "user": (self.configuration.get("user") or None),
            "password": (self.configuration.get("password") or None),
        }

        connection = jdbc.connect(jclassname=jdbc_class, url=jdbc_url, driver_args=driver_args, jars=jars)

        cursor = connection.cursor()
        try:
            cursor.execute(query)
            results = cursor.fetchall()

            columns = self.fetch_columns([(i[0], TYPES_MAP.get(i[1], None)) for i in cursor.description])

            rows = [dict(zip((column["name"] for column in columns), row)) for row in results]

            data = {"columns": columns, "rows": rows}
            error = None
        finally:
            connection.close()

        return data, error


register(JDBC)
