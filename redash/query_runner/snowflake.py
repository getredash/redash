try:
    import snowflake.connector
    from cryptography.hazmat.primitives.serialization import load_pem_private_key

    enabled = True
except ImportError:
    enabled = False


from redash import __version__
from redash.query_runner import (
    TYPE_BOOLEAN,
    TYPE_DATE,
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
    BaseSQLQueryRunner,
    register,
)

TYPES_MAP = {
    0: TYPE_INTEGER,
    1: TYPE_FLOAT,
    2: TYPE_STRING,
    3: TYPE_DATE,
    4: TYPE_DATETIME,
    5: TYPE_STRING,
    6: TYPE_DATETIME,
    7: TYPE_DATETIME,
    8: TYPE_DATETIME,
    13: TYPE_BOOLEAN,
}


class Snowflake(BaseSQLQueryRunner):
    noop_query = "SELECT 1"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "account": {"type": "string"},
                "user": {"type": "string"},
                "password": {"type": "string"},
                "private_key": {"type": "string"},
                "warehouse": {"type": "string"},
                "database": {"type": "string"},
                "region": {"type": "string", "default": "us-west"},
                "lower_case_columns": {
                    "type": "boolean",
                    "title": "Lower Case Column Names in Results",
                    "default": False,
                },
                "host": {"type": "string"},
            },
            "order": [
                "account",
                "user",
                "password",
                "private_key",
                "warehouse",
                "database",
                "region",
                "host",
            ],
            "required": ["user", "account", "database", "warehouse"],
            "secret": ["password", "private_key"],
            "extra_options": [
                "host",
            ],
        }

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def determine_type(cls, data_type, scale):
        t = TYPES_MAP.get(data_type, None)
        if t == TYPE_INTEGER and scale > 0:
            return TYPE_FLOAT
        return t
    
    def _clean_newlines(self,s):

        s = s.strip().replace(" ","").replace("\n","")

        chunks = []
        chunk_size = 64
        start = 0
        while len(s) > start:
            chunks.append(s[start:start+chunk_size])
            start = start+chunk_size
        
        return '\n'.join(chunks)
    
    def _get_private_key(self):

        private_key_str = self.configuration["private_key"]

        header = "-----BEGIN PRIVATE KEY-----"
        footer = "-----END PRIVATE KEY-----"
        private_key_str = private_key_str.replace(footer,"").replace(header,"")

        private_key_str = self._clean_newlines(private_key_str)
        private_key_str = f"{header}\n{private_key_str}\n{footer}\n"
        private_key = load_pem_private_key(private_key_str.encode(),None)

        return private_key

    def _get_connection(self):
        region = self.configuration.get("region")
        account = self.configuration["account"]

        # for us-west we don't need to pass a region (and if we do, it fails to connect)
        if region == "us-west":
            region = None

        if self.configuration.__contains__("host"):
            host = self.configuration.get("host")
        else:
            if region:
                host = "{}.{}.snowflakecomputing.com".format(account, region)
            else:
                host = "{}.snowflakecomputing.com".format(account)
                
        if self.configuration.__contains__("password"):
            connection = snowflake.connector.connect(
                user=self.configuration["user"],
                password=self.configuration["password"],
                account=account,
                region=region,
                host=host,
                application="Redash/{} (Snowflake)".format(__version__.split("-")[0]),
            )
        else:
            connection = snowflake.connector.connect(
                user=self.configuration["user"],
                private_key=self._get_private_key(),
                account=account,
                region=region,
                host=host,
                application="Redash/{} (Snowflake)".format(__version__.split("-")[0]),
            )

        return connection

    def _column_name(self, column_name):
        if self.configuration.get("lower_case_columns", False):
            return column_name.lower()

        return column_name

    def _parse_results(self, cursor):
        columns = self.fetch_columns(
            [(self._column_name(i[0]), self.determine_type(i[1], i[5])) for i in cursor.description]
        )
        rows = [dict(zip((column["name"] for column in columns), row)) for row in cursor]

        data = {"columns": columns, "rows": rows}
        return data

    def run_query(self, query, user):
        connection = self._get_connection()
        cursor = connection.cursor()

        try:
            cursor.execute("USE WAREHOUSE {}".format(self.configuration["warehouse"]))
            cursor.execute("USE {}".format(self.configuration["database"]))

            cursor.execute(query)

            data = self._parse_results(cursor)
            error = None
        finally:
            cursor.close()
            connection.close()

        return data, error

    def _run_query_without_warehouse(self, query):
        connection = self._get_connection()
        cursor = connection.cursor()

        try:
            cursor.execute("USE {}".format(self.configuration["database"]))

            cursor.execute(query)

            data = self._parse_results(cursor)
            error = None
        finally:
            cursor.close()
            connection.close()

        return data, error

    def _database_name_includes_schema(self):
        return "." in self.configuration.get("database")

    def get_schema(self, get_stats=False):
        if self._database_name_includes_schema():
            query = "SHOW COLUMNS"
        else:
            query = "SHOW COLUMNS IN DATABASE"

        results, error = self._run_query_without_warehouse(query)

        if error is not None:
            self._handle_run_query_error(error)

        schema = {}
        for row in results["rows"]:
            if row["kind"] == "COLUMN":
                table_name = "{}.{}".format(row["schema_name"], row["table_name"])

                if table_name not in schema:
                    schema[table_name] = {"name": table_name, "columns": []}

                schema[table_name]["columns"].append(row["column_name"])

        return list(schema.values())


register(Snowflake)
