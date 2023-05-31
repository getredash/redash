import datetime
import logging
import sys
import time
from base64 import b64decode

import httplib2
import requests

from redash import settings, models
from redash.query_runner import *
from redash.utils import json_dumps, json_loads

logger = logging.getLogger(__name__)

try:
    import apiclient.errors
    from apiclient.discovery import build
    from apiclient.errors import HttpError
    from oauth2client.service_account import ServiceAccountCredentials
    from oauth2client.client import AccessTokenCredentials
    enabled = True
except ImportError:
    enabled = False

types_map = {
    "INTEGER": TYPE_INTEGER,
    "FLOAT": TYPE_FLOAT,
    "BOOLEAN": TYPE_BOOLEAN,
    "STRING": TYPE_STRING,
    "TIMESTAMP": TYPE_DATETIME,
}


def transform_cell(field_type, cell_value):
    if cell_value is None:
        return None
    if field_type == "INTEGER":
        return int(cell_value)
    elif field_type == "FLOAT":
        return float(cell_value)
    elif field_type == "BOOLEAN":
        return cell_value.lower() == "true"
    elif field_type == "TIMESTAMP":
        return datetime.datetime.fromtimestamp(float(cell_value))
    return cell_value


def transform_row(row, fields):
    row_data = {}

    for column_index, cell in enumerate(row["f"]):
        field = fields[column_index]
        if field.get("mode") == "REPEATED":
            cell_value = [
                transform_cell(field["type"], item["v"]) for item in cell["v"]
            ]
        else:
            cell_value = transform_cell(field["type"], cell["v"])

        row_data[field["name"]] = cell_value

    return row_data


def _load_key(filename):
    f = file(filename, "rb")
    try:
        return f.read()
    finally:
        f.close()


def _get_query_results(jobs, project_id, location, job_id, start_index):
    query_reply = jobs.getQueryResults(
        projectId=project_id, location=location, jobId=job_id, startIndex=start_index
    ).execute()
    logging.debug("query_reply %s", query_reply)
    if not query_reply["jobComplete"]:
        time.sleep(10)
        return _get_query_results(jobs, project_id, location, job_id, start_index)

    return query_reply


def _get_total_bytes_processed_for_resp(bq_response):
    # BigQuery hides the total bytes processed for queries to tables with row-level access controls.
    # For these queries the "totalBytesProcessed" field may not be defined in the response.
    return int(bq_response.get("totalBytesProcessed", "0"))


class BigQuery(BaseQueryRunner):
    should_annotate_query = False
    noop_query = "SELECT 1"

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "projectId": {"type": "string", "title": "Project ID"},
                "totalMBytesProcessedLimit": {
                    "type": "number",
                    "title": "Scanned Data Limit (MB)",
                },
                "userDefinedFunctionResourceUri": {
                    "type": "string",
                    "title": "UDF Source URIs (i.e. gs://bucket/date_utils.js, gs://bucket/string_utils.js )",
                },
                "useStandardSql": {
                    "type": "boolean",
                    "title": "Use Standard SQL",
                    "default": True,
                },
                "location": {"type": "string", "title": "Processing Location"},
                "loadSchema": {"type": "boolean", "title": "Load Schema"},
                "maximumBillingTier": {
                    "type": "number",
                    "title": "Maximum Billing Tier",
                },
            },
            "required": ["projectId"],
            "order": [
                "projectId",
                "loadSchema",
                "useStandardSql",
                "location",
                "totalMBytesProcessedLimit",
                "maximumBillingTier",
                "userDefinedFunctionResourceUri",
            ],
        }

    def _get_token_using_service_account(self):
        scopes = ["https://www.googleapis.com/auth/bigquery"]
        try:
            return ServiceAccountCredentials.from_json_keyfile_name(settings.REDASH_SERVICE_ACCOUNT_PATH, scopes)
        except ValueError:
            creds = ServiceAccountCredentials.from_stream(settings.REDASH_SERVICE_ACCOUNT_PATH)
            creds.scopes = scopes
            return creds

    def _get_token_using_user_oauth_saved_creds(self, user):
        refresh_token = user.fetch_credentials('bq_oauth_refresh_token')

        params = {
            "grant_type": "refresh_token",
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "refresh_token": refresh_token
        }
        authorization_url = "https://www.googleapis.com/oauth2/v4/token"
        r = requests.post(authorization_url, data=params)

        if r.ok:
            tok = r.json()['access_token']
        else:
            message = """BigQuery authorization did not succeed for user: {}, try clicking on the `Auth` button.
            status: {} message: {}""".format(user.email, r.status_code, str(r.text))
            raise Exception(message)

        return AccessTokenCredentials(tok, 'my-user-agent/1.0')

    def get_generic_user_group_id(self, user):
        """
        :param user: The user who calls this method
        :return: -1 if no generic user group exists or user is None otherwise return the group id
        """

        groups = models.Group.find_by_name(models.Organization.get_by_id(user.org_id),
                                           [settings.REDASH_GENERIC_USER_GROUP])
        if not groups:
            return -1
        return groups[0].id

    def _get_bigquery_service(self, user, is_scheduled=False):

        if user is None:
            # refresh schema has called
            creds = self._get_token_using_service_account()
        else:
            project_id = self.configuration["projectId"]
            generic_user_group_id = self.get_generic_user_group_id(user)

            if generic_user_group_id in list(user.group_ids):
                # use service account credentials for generic accounts, that is used by calling services
                # to make api calls to redash.
                creds = self._get_token_using_service_account()
                logger.warn("Using service account credentials for generic account: %s, project_id: %s",
                            user.email, project_id)
            elif is_scheduled:
                if 'bq_oauth_refresh_token' not in user.credentials:
                    # user has not authenticated use service account.
                    creds = self._get_token_using_service_account()
                    logger.warn("Using service account credentials for user: %s, project_id: %s, is_scheduled: %s",
                                user.email, project_id, is_scheduled)
                else:
                    try:
                        # user has authenticated
                        creds = self._get_token_using_user_oauth_saved_creds(user)
                    except Exception:
                        # user has authenticated but creds may have expired or permission changed in INFOSEC
                        # why it might occur: https://developers.google.com/identity/protocols/oauth2#expiration
                        # we will log an error here, but continue to facilitate query execution with service account.
                        logger.exception("BigQuery scheduled query execution failed due to user: %s oauth credentials, "
                                         "attempting to execute query using service account", user.email)
                        creds = self._get_token_using_service_account()
            else:
                # user is using web UI to execute the query.
                if 'bq_oauth_refresh_token' not in user.credentials:
                    message = """User has not authenticated with oAuth.
                        Please click the 'Auth' button in the query editor page while selecting bigquery data source to complete the authentication."""
                    raise Exception(message)

                creds = self._get_token_using_user_oauth_saved_creds(user)

        http = httplib2.Http(timeout=settings.BIGQUERY_HTTP_TIMEOUT)
        http = creds.authorize(http)

        return build("bigquery", "v2", http=http, cache_discovery=False)

    def _get_project_id(self):
        return self.configuration["projectId"]

    def _get_location(self):
        return self.configuration.get("location")

    def _get_total_bytes_processed(self, jobs, query):
        job_data = {"query": query, "dryRun": True}

        if self._get_location():
            job_data["location"] = self._get_location()

        if self.configuration.get("useStandardSql", False):
            job_data["useLegacySql"] = False

        response = jobs.query(projectId=self._get_project_id(), body=job_data).execute()
        return _get_total_bytes_processed_for_resp(response)

    def _get_job_data(self, query):
        job_data = {"configuration": {"query": {"query": query}}}

        if self._get_location():
            job_data["jobReference"] = {"location": self._get_location()}

        if self.configuration.get("useStandardSql", False):
            job_data["configuration"]["query"]["useLegacySql"] = False

        if self.configuration.get("userDefinedFunctionResourceUri"):
            resource_uris = self.configuration["userDefinedFunctionResourceUri"].split(
                ","
            )
            job_data["configuration"]["query"]["userDefinedFunctionResources"] = [
                {"resourceUri": resource_uri} for resource_uri in resource_uris
            ]

        if "maximumBillingTier" in self.configuration:
            job_data["configuration"]["query"][
                "maximumBillingTier"
            ] = self.configuration["maximumBillingTier"]

        return job_data

    def _get_query_result(self, jobs, query):
        project_id = self._get_project_id()
        job_data = self._get_job_data(query)
        insert_response = jobs.insert(projectId=project_id, body=job_data).execute()
        self.current_job_id = insert_response["jobReference"]["jobId"]
        current_row = 0
        query_reply = _get_query_results(
            jobs,
            project_id=project_id,
            location=self._get_location(),
            job_id=self.current_job_id,
            start_index=current_row,
        )

        logger.debug("bigquery replied: %s", query_reply)

        rows = []

        while ("rows" in query_reply) and current_row < int(query_reply["totalRows"]):
            for row in query_reply["rows"]:
                rows.append(transform_row(row, query_reply["schema"]["fields"]))

            current_row += len(query_reply["rows"])

            query_result_request = {
                "projectId": project_id,
                "jobId": query_reply["jobReference"]["jobId"],
                "startIndex": current_row,
            }

            if self._get_location():
                query_result_request["location"] = self._get_location()

            query_reply = jobs.getQueryResults(**query_result_request).execute()

        columns = [
            {
                "name": f["name"],
                "friendly_name": f["name"],
                "type": "string"
                if f.get("mode") == "REPEATED"
                else types_map.get(f["type"], "string"),
            }
            for f in query_reply["schema"]["fields"]
        ]

        data = {
            "columns": columns,
            "rows": rows,
            "metadata": {"data_scanned": _get_total_bytes_processed_for_resp(query_reply)},
        }

        return data

    def _get_columns_schema(self, table_data):
        columns = []
        for column in table_data.get("schema", {}).get("fields", []):
            columns.extend(self._get_columns_schema_column(column))

        project_id = self._get_project_id()
        table_name = table_data["id"].replace("%s:" % project_id, "")
        return {"name": table_name, "columns": columns}

    def _get_columns_schema_column(self, column):
        columns = []
        if column["type"] == "RECORD":
            for field in column["fields"]:
                columns.append("{}.{}".format(column["name"], field["name"]))
        else:
            columns.append(column["name"])

        return columns

    def _get_project_datasets(self, project_id):
        result = []
        service = self._get_bigquery_service()

        datasets = service.datasets().list(projectId=project_id).execute()
        result.extend(datasets.get("datasets", []))
        nextPageToken = datasets.get('nextPageToken', None)

        while nextPageToken is not None:
            datasets = service.datasets().list(projectId=project_id, pageToken=nextPageToken).execute()
            result.extend(datasets.get("datasets", []))
            nextPageToken = datasets.get('nextPageToken', None)

        return result

    def get_schema(self, get_stats=False, user=None):
        if not self.configuration.get("loadSchema", False):
            return []

        project_id = self._get_project_id()
        datasets = self._get_project_datasets(project_id)

        query_base = """
        SELECT table_schema, table_name, column_name
        FROM `{dataset_id}`.INFORMATION_SCHEMA.COLUMNS
        WHERE table_schema NOT IN ('information_schema')
        """

        schema = {}
        queries = []
        for dataset in datasets:
            dataset_id = dataset["datasetReference"]["datasetId"]
            query = query_base.format(dataset_id=dataset_id)
            queries.append(query)

        query = '\nUNION ALL\n'.join(queries)
        results, error = self.run_query(query, user, False)
        if error is not None:
            self._handle_run_query_error(error)

        results = json_loads(results)
        for row in results["rows"]:
            table_name = "{0}.{1}".format(row["table_schema"], row["table_name"])
            if table_name not in schema:
                schema[table_name] = {"name": table_name, "columns": []}
            schema[table_name]["columns"].append(row["column_name"])

        return list(schema.values())

    def run_query(self, query, user, is_scheduled=False):
        logger.debug("BigQuery got query: %s", query)

        bigquery_service = self._get_bigquery_service(user, is_scheduled)
        jobs = bigquery_service.jobs()

        try:
            if "totalMBytesProcessedLimit" in self.configuration:
                limitMB = self.configuration["totalMBytesProcessedLimit"]
                processedMB = (
                    self._get_total_bytes_processed(jobs, query) / 1000.0 / 1000.0
                )
                if limitMB < processedMB:
                    return (
                        None,
                        "Larger than %d MBytes will be processed (%f MBytes)"
                        % (limitMB, processedMB),
                    )

            data = self._get_query_result(jobs, query)
            error = None

            json_data = json_dumps(data, ignore_nan=True)
        except apiclient.errors.HttpError as e:
            json_data = None
            if e.resp.status in [400, 404]:
                error = json_loads(e.content)["error"]["message"]
            else:
                error = e.content
        except (KeyboardInterrupt, InterruptException, JobTimeoutException):
            if self.current_job_id:
                self._get_bigquery_service().jobs().cancel(
                    projectId=self._get_project_id(),
                    jobId=self.current_job_id,
                    location=self._get_location(),
                ).execute()

            raise

        return json_data, error


register(BigQuery)
