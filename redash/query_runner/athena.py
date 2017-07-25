import logging
import json
import os
import re

import requests

try:
    import pyathena
    enabled = True 
except ImportError:
    enabled = False

try:
    import botocore.session
    from botocore.exceptions import WaiterError
    direct_enabled = True
except ImportError:
    direct_enabled = False

from redash.query_runner import *
from redash.utils import JSONEncoder
from redash.settings import parse_boolean

logger = logging.getLogger(__name__)
PROXY_URL = os.environ.get('ATHENA_PROXY_URL')
ANNOTATE_QUERY = parse_boolean(os.environ.get('ATHENA_ANNOTATE_QUERY', 'true'))
SHOW_EXTRA_SETTINGS = parse_boolean(os.environ.get('ATHENA_SHOW_EXTRA_SETTINGS', 'true'))
OPTIONAL_CREDENTIALS = parse_boolean(os.environ.get('ATHENA_OPTIONAL_CREDENTIALS', 'true'))

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

class AthenaUpstream(BaseQueryRunner):
    noop_query = 'SELECT 1'

    @classmethod
    def name(cls):
        return "Amazon Athena (Upstream PyAthena)"

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
                "toggle_table_string": {
                    "type": "string",
                    "title": "Toggle Table String",
                    "default": "_v",
                    "info": "This string will be used to toggle visibility of tables in the schema browser when editing a query in order to remove non-useful tables from sight."
                }
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
        return "athena_upstream"

    def __init__(self, configuration):
        super(AthenaUpstream, self).__init__(configuration)

    def get_schema(self, get_stats=False):
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
            qbytes = 'upstream2'
            try:
                cursor._poll()
                qbytes = cursor._data_scanned_in_bytes
            except AttributeError as e:
                debug("Athena Upstream can't get data_scanned_in_bytes: %s", e)
            data = {'columns': columns, 'rows': rows, 'data_scanned': qbytes }
            json_data = json.dumps(data, cls=JSONEncoder)
            error = None
        except KeyboardInterrupt:
            if cursor.query_id:
                cursor.cancel()
            error = "Query cancelled by user."
            json_data = None
        except Exception, ex:
            if cursor.query_id:
                cursor.cancel()
            error = ex.message
            json_data = None

        return json_data, error


register(AthenaUpstream)


class Athena(BaseQueryRunner):
    noop_query = 'SELECT 1'

    @classmethod
    def name(cls):
        return "Amazon Athena (via JDBC)"

    @classmethod
    def type(cls):
        return "athena"

    @classmethod
    def configuration_schema(cls):
        return {
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
                }
            },
            'required': ['region', 'aws_access_key', 'aws_secret_key', 's3_staging_dir'],
            'secret': ['aws_secret_key']
        }

    @classmethod
    def annotate_query(cls):
        return ANNOTATE_QUERY

    def get_schema(self, get_stats=False):
        schema = {}
        query = """
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        """

        results, error = self.run_query(query, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json.loads(results)

        for row in results['rows']:
            table_name = '{}.{}'.format(row['table_schema'], row['table_name'])

            if table_name not in schema:
                schema[table_name] = {'name': table_name, 'columns': []}

            schema[table_name]['columns'].append(row['column_name'])

        return schema.values()

    def run_query(self, query, user):
        try:
            data = {
                'athenaUrl': 'jdbc:awsathena://athena.{}.amazonaws.com:443/'.format(self.configuration['region'].lower()),
                'awsAccessKey': self.configuration['aws_access_key'],
                'awsSecretKey': self.configuration['aws_secret_key'],
                's3StagingDir': self.configuration['s3_staging_dir'],
                'query': query
            }

            response = requests.post(PROXY_URL, json=data)
            response.raise_for_status()

            json_data = response.content.strip()
            error = None

            return json_data, error
        except requests.RequestException as e:
            if e.response.status_code == 400:
                return None, response.content

            return None, str(e)
        except KeyboardInterrupt:
            error = "Query cancelled by user."
            json_data = None

        return json_data, error

register(Athena)

class AthenaDirect(BaseQueryRunner):
    noop_query = 'SELECT 1'

    @classmethod
    def name(cls):
        return "Amazon Athena (direct)"

    @classmethod
    def type(cls):
        return "athenadirect"

    @classmethod
    def enabled(cls):
        return direct_enabled

    @classmethod
    def configuration_schema(cls):
        return {
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
                'database': {
                    'type': 'string',
                    'default': 'default'
                },
                'table_whitelist': {
                    'type': 'string',
                    'title': 'Table whitelist (blank for all)'
                }
            },
            'required': ['region', 'aws_access_key', 'aws_secret_key', 's3_staging_dir'],
            'secret': ['aws_secret_key']
        }

    def _get_client(self):
        BASE_DIR = os.path.dirname(os.path.realpath(__file__))
        session = botocore.session.get_session()
        session.set_credentials(self.configuration['aws_access_key'], self.configuration['aws_secret_key'])
        session.set_config_variable('region', self.configuration['region'])
        session.set_config_variable('data_path', os.path.join(BASE_DIR, 'athena_models'))
        return session.create_client('athena')

    def _get_whitelist(self):
        whitelist = self.configuration['table_whitelist']
        whitelist = re.split(r"\s*,?\s*", whitelist)
        whitelist = set(table for table in whitelist if table)
        return whitelist

    def get_schema(self, get_stats=False):
        client = self._get_client()
        schemas = []
        schema_names = [n['Name'] for n in client.get_namespaces()['NamespaceList']]
        whitelist = self._get_whitelist()
        for schema_name in schema_names:
            tables = client.get_tables(NamespaceName=schema_name)['TableList']
            globname = '{}.*'.format(schema_name)
            for table in tables:
                fullname = '{}.{}'.format(schema_name, table['Name'])
                if not whitelist or globname in whitelist or fullname in whitelist:
                    schemas.append({'name': fullname,
                                    'columns': [col['Name'] for col in table['StorageDescriptor']['Columns']]})
        return schemas

    def run_query(self, query, user):
        client = self._get_client()
        response = client.run_query(
            Query=query,
            OutputLocation=self.configuration['s3_staging_dir'],
            QueryExecutionContext={'Database': self.configuration['database']})
        waiter = client.get_waiter('query_completed')
        try:
            waiter.wait(QueryExecutionId=response['QueryExecutionId'])
        except WaiterError as e:
            raise ValueError(e.last_response['QueryExecutionDetail']['Status']
                             ['StateChangeReason'])


        paginator = client.get_paginator('get_query_results')
        iterator = paginator.paginate(QueryExecutionId=response['QueryExecutionId'])
        # this API isn't documented so let's do a consistency check
        column_info_set = set()
        column_info = None
        rows = []
        for result in iterator:
            column_info = result['ResultSet']['ColumnInfos']
            column_info_set.add(json.dumps(result['ResultSet']['ColumnInfos']))
            assert len(column_info_set) == 1, "Don't know what to do with inconsistent column info"
            rows.extend(result['ResultSet']['ResultRows'])
        cnames = [c['Name'] for c in column_info]
        data = {'columns':
                [{
                    'name': name,
                    'friendly_name': name,
                    'type': 'string', # XXX map athena types to redash types
                } for name in cnames],
                'rows':
                [{name: row['Data'][i] for (i, name) in enumerate(cnames)}
                 for row in rows[1:]]
        }

        return json.dumps(data, cls=JSONEncoder), None

register(AthenaDirect)
