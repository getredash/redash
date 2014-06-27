import datetime
import httplib2
import json
import logging
import sys
import time

try:
    import apiclient.errors
    from apiclient.discovery import build
    from apiclient.errors import HttpError
    from oauth2client.client import SignedJwtAssertionCredentials
except ImportError:
    print "Missing dependencies. Please install google-api-python-client and oauth2client."
    print "You can use pip:   pip install google-api-python-client oauth2client"

from redash.utils import JSONEncoder

types_map = {
    'INTEGER': 'integer',
    'FLOAT': 'float',
    'BOOLEAN': 'boolean',
    'STRING': 'string',
    'TIMESTAMP': 'datetime',
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

def bigquery(connection_string):
    def load_key(filename):
        f = file(filename, "rb")
        try:
            return f.read()
        finally:
            f.close()

    def get_bigquery_service():
        scope = [
            "https://www.googleapis.com/auth/bigquery",
        ]

        credentials = SignedJwtAssertionCredentials(connection_string["serviceAccount"],
                                                    load_key(connection_string["privateKey"]), scope=scope)
        http = httplib2.Http()
        http = credentials.authorize(http)

        return build("bigquery", "v2", http=http)

    def get_query_results(jobs, project_id, job_id, start_index):
        query_reply = jobs.getQueryResults(projectId=project_id, jobId=job_id, startIndex=start_index).execute()
        logging.debug('query_reply %s', query_reply)
        if not query_reply['jobComplete']:
            time.sleep(10)
            return get_query_results(jobs, project_id, job_id, start_index)

        return query_reply

    def query_runner(query):
        bigquery_service = get_bigquery_service()

        jobs = bigquery_service.jobs()
        job_data = {
            "configuration": {
                "query": {
                    "query": query,
                }
            }
        }

        logging.debug("bigquery got query: %s", query)

        project_id = connection_string["projectId"]

        try:
            insert_response = jobs.insert(projectId=project_id, body=job_data).execute()
            current_row = 0
            query_reply = get_query_results(jobs, project_id=project_id,
                                            job_id=insert_response['jobReference']['jobId'], start_index=current_row)

            logging.debug("bigquery replied: %s", query_reply)

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
            error = None

            json_data = json.dumps(data, cls=JSONEncoder)
        except apiclient.errors.HttpError, e:
            json_data = None
            error = e.content
        except KeyboardInterrupt:
            error = "Query cancelled by user."
            json_data = None
        except Exception:
            raise sys.exc_info()[1], None, sys.exc_info()[2]

        return json_data, error


    return query_runner
