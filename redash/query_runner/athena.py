import json
import os

import requests

from redash.query_runner import BaseQueryRunner, register

PROXY_URL = os.environ.get('ATHENA_PROXY_URL')

class Athena(BaseQueryRunner):
    noop_query = 'SELECT 1'

    @classmethod
    def name(cls):
        return "Amazon Athena"

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
