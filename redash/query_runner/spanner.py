import json
import logging
from base64 import b64decode

from redash.query_runner import (
    BaseQueryRunner,
    register,
    TYPE_STRING,
    TYPE_INTEGER,
    TYPE_BOOLEAN,
    TYPE_DATE,
    TYPE_DATETIME,
    TYPE_FLOAT
)

logger = logging.getLogger(__name__)

try:
    from google.cloud.spanner_dbapi.connection import connect
    from google.oauth2.service_account import Credentials

    enabled = True
except ImportError:
    logger.error("Error loading Spanner dependencies. You need to install the google-cloud-spanner package.")
    enabled = False


class Spanner(BaseQueryRunner):

    @classmethod
    def configuration_schema(cls):

        return {
            "type": "object",
            "properties": {
                "project_id": {"type": "string", "title": "Project ID"},
                "instance_id": {"type": "string", "title": "Instance ID"},
                "database_id": {"type": "string", "title": "Database ID"},
                "credentialsFile": {"type": "string", "title": "Credentials File"},
            },
            "order": ["project_id", "instance_id", "database_id", "credentialsFile"],
            "required": ["project_id", "instance_id", "database_id"],
            "secret": ["credentialsFile"],
        }


    @classmethod
    def type(cls):
        return "spanner"


    @classmethod
    def enabled(cls):
        return enabled


    def __init__(self, configuration):
        super(Spanner, self).__init__(configuration)


    def _get_connection(self):

        credentials_file_content = self.configuration.get("credentialsFile")
        credentials_json = b64decode(credentials_file_content)
        credentials = Credentials.from_service_account_info(json.loads(credentials_json))

        connection = connect(
            instance_id=self.configuration.get("instance_id"),
            database_id=self.configuration.get("database_id"),
            project=self.configuration.get("project_id"),
            credentials=credentials
        )

        connection.autocommit = True

        return connection


    def test_connection(self):

        connection = self._get_connection()
        cursor = connection.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        connection.close()


    def run_query(self, query, user):
        connection = self._get_connection()
        cursor = connection.cursor()

        try:
            cursor.execute(query)
            columns = self.fetch_columns([(i[0], i[1]) for i in cursor.description])
            rows = [self.prepare_col_value(cursor.description, row) for row in cursor.fetchall()]

            data = {
                "columns": columns,
                "rows": rows
            }

            error = None

        except Exception as e:
            data = None
            error = str(e)
        finally:
            cursor.close()
            connection.close()

        return data, error


    @staticmethod
    def prepare_col_value(col_descriptions, row):

        row_dict = {}
        for (desc, val) in zip(col_descriptions, row):
            if desc[1] == 'BYTES':
                val = b64decode(val)
            row_dict[desc[0]] = val

        return row_dict


    def fetch_columns(self, columns):

        column_types = {
            "STRING": TYPE_STRING,
            "INT64": TYPE_INTEGER,
            "BOOL": TYPE_BOOLEAN,
            "DATE": TYPE_DATE,
            "TIMESTAMP": TYPE_DATETIME,
            "FLOAT64": TYPE_FLOAT
        }

        return [
            {"name": col[0], "friendly_name": col[0], "type": column_types.get(col[1], TYPE_STRING)}
            for col in columns
        ]

    def get_schema(self, get_stats=False):

        schema = {}

        query = """
            SELECT t.table_name, c.column_name
            FROM information_schema.tables AS t
            JOIN information_schema.columns AS c
            ON t.table_name = c.table_name
            WHERE t.table_catalog = '' AND t.table_schema = ''
        """

        try:
            connection = self._get_connection()
            cursor = connection.cursor()
            cursor.execute(query)
            schema_result = cursor.fetchall()

            for table_name, column_name in schema_result:
                if table_name not in schema:
                    schema[table_name] = {"name": table_name, "columns": []}
                schema[table_name]["columns"].append(column_name)

        except Exception as e:
            logger.error(f"Error fetching schema: {e}")
            schema = {}

        finally:
            cursor.close()
            connection.close()

        return list(schema.values())


register(Spanner)