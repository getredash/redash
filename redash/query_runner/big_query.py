from base64 import b64decode
import datetime
import json
import httplib2
import logging
import sys
import time

import requests

from redash import settings
from redash.query_runner import *
from redash.utils import JSONEncoder

logger = logging.getLogger(__name__)

try:
    import apiclient.errors
    from apiclient.discovery import build
    from apiclient.errors import HttpError
    from oauth2client.client import SignedJwtAssertionCredentials
    from oauth2client import gce

    enabled = True
except ImportError:
    enabled = False

types_map = {
    'INTEGER': TYPE_INTEGER,
    'FLOAT': TYPE_FLOAT,
    'BOOLEAN': TYPE_BOOLEAN,
    'STRING': TYPE_STRING,
    'TIMESTAMP': TYPE_DATETIME,
}


def transform_row(row, fields):
    column_index = 0
    row_data = {}

    for cell in row["f"]:
        field = fields[column_index]
        cell_value = cell['v']

        if cell_value is None:
            pass
        # Otherwise just cast the value
        elif field['type'] == 'INTEGER':
            cell_value = int(cell_value)
        elif field['type'] == 'FLOAT':
            cell_value = float(cell_value)
        elif field['type'] == 'BOOLEAN':
            cell_value = cell_value.lower() == "true"
        elif field['type'] == 'TIMESTAMP':
            cell_value = datetime.datetime.fromtimestamp(float(cell_value))

        row_data[field["name"]] = cell_value
        column_index += 1

    return row_data


def _load_key(filename):
    f = file(filename, "rb")
    try:
        return f.read()
    finally:
        f.close()


def _get_query_results(jobs, project_id, job_id, start_index):
    query_reply = jobs.getQueryResults(projectId=project_id, jobId=job_id, startIndex=start_index).execute()
    logging.debug('query_reply %s', query_reply)
    if not query_reply['jobComplete']:
        time.sleep(10)
        return _get_query_results(jobs, project_id, job_id, start_index)

    return query_reply


class BigQuery(BaseQueryRunner):
    noop_query = "SELECT 1"

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'projectId': {
                    'type': 'string',
                    'title': 'Project ID'
                },
                'jsonKeyFile': {
                    "type": "string",
                    'title': 'JSON Key File'
                },
                'totalMBytesProcessedLimit': {
                    "type": "number",
                    'title': 'Total MByte Processed Limit'
                },
                'userDefinedFunctionResourceUri': {
                    "type": "string",
                    'title': 'UDF Source URIs (i.e. gs://bucket/date_utils.js, gs://bucket/string_utils.js )'
                },
                'useStandardSql': {
                    "type": "boolean",
                    'title': "Use Standard SQL (Beta)",
                },
                'loadSchema': {
                    "type": "boolean",
                    "title": "Load Schema"
                }
            },
            'required': ['jsonKeyFile', 'projectId'],
            'secret': ['jsonKeyFile']
        }

    @classmethod
    def annotate_query(cls):
        return False

    def __init__(self, configuration):
        super(BigQuery, self).__init__(configuration)

    def _get_bigquery_service(self):
        scope = [
            "https://www.googleapis.com/auth/bigquery",
            "https://www.googleapis.com/auth/drive"
        ]

        key = json.loads(b64decode(self.configuration['jsonKeyFile']))

        credentials = SignedJwtAssertionCredentials(key['client_email'], key['private_key'], scope=scope)
        http = httplib2.Http(timeout=settings.BIGQUERY_HTTP_TIMEOUT)
        http = credentials.authorize(http)

        return build("bigquery", "v2", http=http)

    def _get_project_id(self):
        return self.configuration["projectId"]

    def _get_total_bytes_processed(self, jobs, query):
        job_data = {
            "query": query,
            "dryRun": True,
        }
        
        if self.configuration.get('useStandardSql', False):
            job_data['useLegacySql'] = False
            
        response = jobs.query(projectId=self._get_project_id(), body=job_data).execute()
        return int(response["totalBytesProcessed"])

    def _get_query_result(self, jobs, query):
        project_id = self._get_project_id()
        job_data = {
            "configuration": {
                "query": {
                    "query": query,
                }
            }
        }
        
        if self.configuration.get('useStandardSql', False):
            job_data['configuration']['query']['useLegacySql'] = False


        if "userDefinedFunctionResourceUri" in self.configuration:
            resource_uris = self.configuration["userDefinedFunctionResourceUri"].split(',')
            job_data["configuration"]["query"]["userDefinedFunctionResources"] = map(
                lambda resource_uri: {"resourceUri": resource_uri}, resource_uris)

        insert_response = jobs.insert(projectId=project_id, body=job_data).execute()
        current_row = 0
        query_reply = _get_query_results(jobs, project_id=project_id,
                                         job_id=insert_response['jobReference']['jobId'], start_index=current_row)

        logger.debug("bigquery replied: %s", query_reply)

        rows = []

        while ("rows" in query_reply) and current_row < query_reply['totalRows']:
            for row in query_reply["rows"]:
                rows.append(transform_row(row, query_reply["schema"]["fields"]))

            current_row += len(query_reply['rows'])
            query_reply = jobs.getQueryResults(projectId=project_id, jobId=query_reply['jobReference']['jobId'],
                                               startIndex=current_row).execute()

        columns = [{'name': f["name"],
                    'friendly_name': f["name"],
                    'type': types_map.get(f['type'], "string")} for f in query_reply["schema"]["fields"]]

        data = {
            "columns": columns,
            "rows": rows
        }

        return data

    def get_schema(self, get_stats=False):
        if not self.configuration.get('loadSchema', False):
            return []

        service = self._get_bigquery_service()
        project_id = self._get_project_id()
        datasets = service.datasets().list(projectId=project_id).execute()
        schema = []
        for dataset in datasets.get('datasets', []):
            dataset_id = dataset['datasetReference']['datasetId']
            tables = service.tables().list(projectId=project_id, datasetId=dataset_id).execute()
            for table in tables.get('tables', []):
                table_data = service.tables().get(projectId=project_id, datasetId=dataset_id, tableId=table['tableReference']['tableId']).execute()
                print table_data

                schema.append({'name': table_data['id'], 'columns': map(lambda r: r['name'], table_data['schema']['fields'])})

        return schema

    def run_query(self, query, user):
        logger.debug("BigQuery got query: %s", query)

        bigquery_service = self._get_bigquery_service()
        jobs = bigquery_service.jobs()

        try:
            if "totalMBytesProcessedLimit" in self.configuration:
                limitMB = self.configuration["totalMBytesProcessedLimit"]
                processedMB = self._get_total_bytes_processed(jobs, query) / 1000.0 / 1000.0
                if limitMB < processedMB:
                    return None, "Larger than %d MBytes will be processed (%f MBytes)" % (limitMB, processedMB)

            data = self._get_query_result(jobs, query)
            error = None

            json_data = json.dumps(data, cls=JSONEncoder)
        except apiclient.errors.HttpError, e:
            json_data = None
            if e.resp.status == 400:
                error = json.loads(e.content)['error']['message']
            else:
                error = e.content
        except KeyboardInterrupt:
            error = "Query cancelled by user."
            json_data = None
        except Exception:
            raise sys.exc_info()[1], None, sys.exc_info()[2]

        return json_data, error


class BigQueryGCE(BigQuery):
    @classmethod
    def type(cls):
        return "bigquery_gce"

    @classmethod
    def enabled(cls):
        try:
            # check if we're on a GCE instance
            requests.get('http://metadata.google.internal')
        except requests.exceptions.ConnectionError:
            return False

        return True

    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'totalMBytesProcessedLimit': {
                    "type": "number",
                    'title': 'Total MByte Processed Limit'
                },
                'userDefinedFunctionResourceUri': {
                    "type": "string",
                    'title': 'UDF Source URIs (i.e. gs://bucket/date_utils.js, gs://bucket/string_utils.js )'
                },
                'useStandardSql': {
                    "type": "boolean",
                    'title': "Use Standard SQL (Beta)",
                },
                'loadSchema': {
                    "type": "boolean",
                    "title": "Load Schema"
                }
            }
        }

    def _get_project_id(self):
        return requests.get('http://metadata/computeMetadata/v1/project/project-id', headers={'Metadata-Flavor': 'Google'}).content

    def _get_bigquery_service(self):
        credentials = gce.AppAssertionCredentials(scope='https://www.googleapis.com/auth/bigquery')
        http = httplib2.Http()
        http = credentials.authorize(http)

        return build("bigquery", "v2", http=http)


register(BigQuery)
register(BigQueryGCE)
