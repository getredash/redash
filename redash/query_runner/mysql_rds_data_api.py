import logging
import json

from redash.query_runner import (
    TYPE_STRING,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_DATETIME,
    TYPE_DATE,
    TYPE_BOOLEAN,
    BaseQueryRunner,
    BaseSQLQueryRunner,
    register
)

try:
    import boto3

    enabled = True
except ImportError:
    enabled = False

logger = logging.getLogger(__name__)

mysqlDataTypeToRedashDataType = {
    "CHAR": TYPE_STRING,
    "VARCHAR": TYPE_STRING,
    "DATETIME": TYPE_DATETIME,
    "DATE": TYPE_DATETIME,
    "TIME": TYPE_DATETIME,
    "TIMESTAMP": TYPE_DATETIME,
    "ENUM": TYPE_STRING,
    "BIGINT": TYPE_INTEGER,
    "DECIMAL": TYPE_FLOAT,
    "FLOAT": TYPE_FLOAT,
    "DOUBLE": TYPE_FLOAT,
    "BIT": TYPE_BOOLEAN,
    "BOOLEAN": TYPE_BOOLEAN,
    "MEDIUMTEXT": TYPE_STRING,
    "TINYTEXT": TYPE_STRING,
    "TEXT": TYPE_STRING,
    "BLOB": TYPE_STRING,
    "MEDIUMBLOB": TYPE_STRING,
    "LONGTEXT": TYPE_STRING,
    "LONGBLOB": TYPE_STRING,
    "TINYINT": TYPE_INTEGER,
    "SMALLINT": TYPE_INTEGER,
    "MEDIUMINT": TYPE_INTEGER,
    "INT": TYPE_INTEGER
}

valueFields = ['stringValue', 'longValue', 'booleanValue']


def parse_response(response):
    columns = []
    for columnMetadata in response['columnMetadata']:
        columns.append({
            "name": columnMetadata['label'],
            "type": mysqlDataTypeToRedashDataType[columnMetadata['typeName']]
        })

    rows = []
    for record in response['records']:
        rowObject = {}
        for i in range(len(record)):
            cell = record[i]
            value = None
            for valueField in valueFields:
                value = cell[valueField] if valueField in cell else value
            rowObject[columns[i]['name']] = value
        rows.append(rowObject)

    return {"columns": columns, "rows": rows}


class DataAPIRDSMySQL(BaseSQLQueryRunner):
    _client = None
    noop_query = "SELECT 1 as test"

    @classmethod
    def name(cls):
        return "MySQL (AWS RDS Data API)"

    @classmethod
    def type(cls):
        return "rds_data_api_mysql"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "aws_access_key": {"type": "string", "title": "AWS Access Key"},
                "aws_secret_key": {"type": "string", "title": "AWS Secret Key"},
                "cluster_arn": {"type": "string", "title": "Cluster ARN"},
                "secret_arn": {"type": "string", "title": "Secret ARN"},
                "db": {"type": "string", "title": "Database name"},
                "region": {"type": "string", "title": "Region"}
            },
            "order": ["aws_access_key", "aws_secret_key", "cluster_arn", "secret_arn", "db", "region"],
            "required": ["aws_access_key", "aws_secret_key", "cluster_arn", "secret_arn", "db", "region"],
            "secret": ["aws_secret_key"],
        }

    @classmethod
    def enabled(cls):
        return enabled

    def _get_client(self):
        if self._client is None:
            self._client = boto3.client(
                'rds-data',
                aws_access_key_id=self.configuration.get("aws_access_key", None),
                aws_secret_access_key=self.configuration.get("aws_secret_key", None),
                region_name=self.configuration.get("region", None)
            )
        return self._client

    def run_query(self, query, user):
        client = self._get_client()
        response = client.execute_statement(
            includeResultMetadata=True,
            secretArn=self.configuration.get('secret_arn'),
            database=self.configuration.get('db'),
            resourceArn=self.configuration.get('cluster_arn'),
            sql=query
        )
        logger.info('raw response')
        logger.info(response)

        parsed = parse_response(response)
        error = None
        json_data = json.dumps(parsed)

        logger.info('parsed response')
        logger.info(json_data)

        return json_data, error

    def _get_tables(self, schema):
        query = """
        SELECT col.table_schema as table_schema,
               col.table_name as table_name,
               col.column_name as column_name
        FROM `information_schema`.`columns` col
        WHERE col.table_schema NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys');
        """

        results, error = self.run_query(query, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json.loads(results)

        for row in results["rows"]:
            logger.info(row)
            if row["table_schema"] != self.configuration["db"]:
                table_name = "{}.{}".format(row["table_schema"], row["table_name"])
            else:
                table_name = row["table_name"]

            if table_name not in schema:
                schema[table_name] = {"name": table_name, "columns": []}

            schema[table_name]["columns"].append(row["column_name"])

        return list(schema.values())

register(DataAPIRDSMySQL)
