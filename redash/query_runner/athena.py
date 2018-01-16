import json
import logging
import os

from redash.query_runner import *
from redash.settings import parse_boolean
from redash.utils import JSONEncoder

logger = logging.getLogger(__name__)
ANNOTATE_QUERY = parse_boolean(os.environ.get('ATHENA_ANNOTATE_QUERY', 'true'))
SHOW_EXTRA_SETTINGS = parse_boolean(os.environ.get('ATHENA_SHOW_EXTRA_SETTINGS', 'true'))
OPTIONAL_CREDENTIALS = parse_boolean(os.environ.get('ATHENA_OPTIONAL_CREDENTIALS', 'true'))

try:
    import pyathena
    import boto3
    enabled = True
except ImportError:
    enabled = False


_TYPE_MAPPINGS = {
    'boolean': TYPE_BOOLEAN,
    'tinyint': TYPE_INTEGER,
    'smallint': TYPE_INTEGER,
    'integer': TYPE_INTEGER,
    'bigint': TYPE_INTEGER,
    'double': TYPE_FLOAT,
    'varchar': TYPE_STRING,
    'timestamp': TYPE_DATETIME,
    'date': TYPE_DATE,
    'varbinary': TYPE_STRING,
    'array': TYPE_STRING,
    'map': TYPE_STRING,
    'row': TYPE_STRING,
    'decimal': TYPE_FLOAT,
}


class SimpleFormatter(object):
    def format(self, operation, parameters=None):
        return operation


class Athena(BaseQueryRunner):
    noop_query = 'SELECT 1'

    @classmethod
    def name(cls):
        return "Amazon Athena"

    @classmethod
    def configuration_schema(cls):
        schema = {
            'type': 'object',
            'properties': {
                'region': {
                    'type': 'string',
                    'title': 'AWS Region'
                },
                'aws_access_key': {
                    'type': 'string',
                    'title': 'AWS Access Key'
                },
                'aws_secret_key': {
                    'type': 'string',
                    'title': 'AWS Secret Key'
                },
                's3_staging_dir': {
                    'type': 'string',
                    'title': 'S3 Staging Path'
                },
                'schema': {
                    'type': 'string',
                    'title': 'Schema Name',
                    'default': 'default'
                },
                'glue': {
                    'type': 'boolean',
                    'title': 'Use Glue Data Catalog',
                },
            },
            'required': ['region', 's3_staging_dir'],
            'order': ['region', 'aws_access_key', 'aws_secret_key', 's3_staging_dir', 'schema'],
            'secret': ['aws_secret_key']
        }

        if SHOW_EXTRA_SETTINGS:
            schema['properties'].update({
                'encryption_option': {
                    'type': 'string',
                    'title': 'Encryption Option',
                },
                'kms_key': {
                    'type': 'string',
                    'title': 'KMS Key',
                },
            })

        if not OPTIONAL_CREDENTIALS:
            schema['required'] += ['aws_access_key', 'aws_secret_key']

        return schema

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def annotate_query(cls):
        return ANNOTATE_QUERY

    @classmethod
    def type(cls):
        return "athena"

    def __init__(self, configuration):
        super(Athena, self).__init__(configuration)

    def __get_schema_from_glue(self):
        client = boto3.client(
                'glue',
                aws_access_key_id=self.configuration.get('aws_access_key', None),
                aws_secret_access_key=self.configuration.get('aws_secret_key', None),
                region_name=self.configuration['region']
                )
        schema = {}

        for database in client.get_databases()['DatabaseList']:
            for table in client.get_tables(DatabaseName=database['Name'])['TableList']:
                table_name = '%s.%s' % (database['Name'], table['Name'])
                if table_name not in schema:
                    column = [columns['Name'] for columns in table['StorageDescriptor']['Columns']]
                    schema[table_name] = {'name': table_name, 'columns': column}
                    for partition in table['PartitionKeys']:
                        schema[table_name]['columns'].append(partition['Name'])

        return schema.values()

    def get_schema(self, get_stats=False):
        if self.configuration.get('glue', False):
            return self.__get_schema_from_glue()

        schema = {}
        query = """
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns
        WHERE table_schema NOT IN ('information_schema')
        """

        results, error = self.run_query(query, None)
        if error is not None:
            raise Exception("Failed getting schema.")

        results = json.loads(results)
        for row in results['rows']:
            table_name = '{0}.{1}'.format(row['table_schema'], row['table_name'])
            if table_name not in schema:
                schema[table_name] = {'name': table_name, 'columns': []}
            schema[table_name]['columns'].append(row['column_name'])

        return schema.values()

    def run_query(self, query, user):
        cursor = pyathena.connect(
            s3_staging_dir=self.configuration['s3_staging_dir'],
            region_name=self.configuration['region'],
            aws_access_key_id=self.configuration.get('aws_access_key', None),
            aws_secret_access_key=self.configuration.get('aws_secret_key', None),
            schema_name=self.configuration.get('schema', 'default'),
            encryption_option=self.configuration.get('encryption_option', None),
            kms_key=self.configuration.get('kms_key', None),
            formatter=SimpleFormatter()).cursor()

        try:
            cursor.execute(query)
            column_tuples = [(i[0], _TYPE_MAPPINGS.get(i[1], None)) for i in cursor.description]
            columns = self.fetch_columns(column_tuples)
            rows = [dict(zip(([c['name'] for c in columns]), r)) for i, r in enumerate(cursor.fetchall())]
            qbytes = None
            try:
                qbytes = cursor.data_scanned_in_bytes
            except AttributeError as e:
                logger.debug("Athena Upstream can't get data_scanned_in_bytes: %s", e)
            data = {'columns': columns, 'rows': rows, 'metadata': {'data_scanned': qbytes}}
            json_data = json.dumps(data, cls=JSONEncoder)
            error = None
        except KeyboardInterrupt:
            if cursor.query_id:
                cursor.cancel()
            error = "Query cancelled by user."
            json_data = None
        except Exception as ex:
            if cursor.query_id:
                cursor.cancel()
            error = ex.message
            json_data = None

        return json_data, error


register(Athena)
