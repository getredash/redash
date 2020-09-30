import datetime
import logging
import operator
import sys
import time
from base64 import b64decode

import httplib2
import requests

from redash import settings
from redash.query_runner import *
from redash.utils import json_dumps, json_loads

logger = logging.getLogger(__name__)

try:
    import apiclient.errors
    from apiclient.discovery import build
    from apiclient.errors import HttpError
    from oauth2client.service_account import ServiceAccountCredentials

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


class BigQuery(BaseQueryRunner):
    should_annotate_query = False
    noop_query = "SELECT 1"
    sample_query = "#standardSQL\n SELECT * FROM {table} LIMIT 1"

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "projectId": {"type": "string", "title": "Project ID"},
                "jsonKeyFile": {"type": "string", "title": "JSON Key File"},
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
                "toggle_table_string": {
                    "type": "string",
                    "title": "Toggle Table String",
                    "default": "_v",
                    "info": "This string will be used to toggle visibility of tables in the schema browser when editing a query in order to remove non-useful tables from sight.",
                },
                "samples": {"type": "boolean", "title": "Show Data Samples"},
            },
            "required": ["jsonKeyFile", "projectId"],
            "order": [
                "projectId",
                "jsonKeyFile",
                "loadSchema",
                "useStandardSql",
                "location",
                "totalMBytesProcessedLimit",
                "maximumBillingTier",
                "userDefinedFunctionResourceUri",
            ],
            "secret": ["jsonKeyFile"],
        }

    def _get_bigquery_service(self):
        scope = [
            "https://www.googleapis.com/auth/bigquery",
            "https://www.googleapis.com/auth/drive",
        ]

        key = json_loads(b64decode(self.configuration["jsonKeyFile"]))

        creds = ServiceAccountCredentials.from_json_keyfile_dict(key, scope)
        http = httplib2.Http(timeout=settings.BIGQUERY_HTTP_TIMEOUT)
        http = creds.authorize(http)

        return build("bigquery", "v2", http=http)

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
        return int(response["totalBytesProcessed"])

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
            "metadata": {"data_scanned": int(query_reply["totalBytesProcessed"])},
        }

        return data

    def _get_columns_schema(self, table_data):
        columns = []
        metadata = []
        for column in table_data.get("schema", {}).get("fields", []):
            metadatum = self._get_column_metadata(column)
            metadata.extend(metadatum)
            columns.extend(map(operator.itemgetter("name"), metadatum))

        project_id = self._get_project_id()
        table_name = table_data["id"].replace("%s:" % project_id, "")
        return {"name": table_name, "columns": columns, "metadata": metadata}

    def _get_column_metadata(self, column):
        metadata = []
        if column["type"] == "RECORD":
            for field in column["fields"]:
                field_name = u"{}.{}".format(column["name"], field["name"])
                metadata.append({"name": field_name, "type": field["type"]})
        else:
            metadata.append({"name": column["name"], "type": column["type"]})
        return metadata

    def _columns_and_samples_to_dict(self, schema, samples):
        samples_dict = {}
        if not samples:
            return samples_dict

        # If a sample exists, its shape/length should be analogous to
        # the schema provided (i.e their lengths should match up)
        for i, column in enumerate(schema):
            if column["type"] == "RECORD":
                if column.get("mode", None) == "REPEATED":
                    # Repeated fields have multiple samples of the same format.
                    # We only need to show the first one as an example.
                    associated_sample = [] if len(samples[i]) == 0 else samples[i][0]
                else:
                    associated_sample = samples[i] or []

                for j, field in enumerate(column["fields"]):
                    field_name = u"{}.{}".format(column["name"], field["name"])
                    samples_dict[field_name] = None
                    if len(associated_sample) > 0:
                        samples_dict[field_name] = associated_sample[j]
            else:
                samples_dict[column["name"]] = samples[i]

        return samples_dict

    def _flatten_samples(self, samples):
        samples_list = []
        for field in samples:
            value = field["v"]
            if isinstance(value, dict):
                samples_list.append(self._flatten_samples(value.get("f", [])))
            elif isinstance(value, list):
                samples_list.append(self._flatten_samples(value))
            else:
                samples_list.append(value)

        return samples_list

    def get_table_sample(self, table_name):
        if not self.configuration.get("loadSchema", False):
            return {}

        service = self._get_bigquery_service()
        project_id = self._get_project_id()

        dataset_id, table_id = table_name.split(".", 1)

        try:
            # NOTE: the `sample_response` is limited by `maxResults` here.
            # Without this limit, the response would be very large and require
            # pagination using `nextPageToken`.
            sample_response = (
                service.tabledata()
                .list(
                    projectId=project_id,
                    datasetId=dataset_id,
                    tableId=table_id,
                    fields="rows",
                    maxResults=1,
                )
                .execute()
            )
            schema_response = (
                service.tables()
                .get(
                    projectId=project_id,
                    datasetId=dataset_id,
                    tableId=table_id,
                    fields="schema,id",
                )
                .execute()
            )
            table_rows = sample_response.get("rows", [])

            if len(table_rows) == 0:
                samples = []
            else:
                samples = table_rows[0].get("f", [])

            schema = schema_response.get("schema", {}).get("fields", [])
            columns = self._get_columns_schema(schema_response).get("columns", [])

            flattened_samples = self._flatten_samples(samples)
            samples_dict = self._columns_and_samples_to_dict(schema, flattened_samples)
            return samples_dict
        except HttpError as http_error:
            logger.exception(
                "Error communicating with server for sample for table %s: %s",
                table_name,
                http_error,
            )

            # If there is an error getting the sample using the API,
            # try to do it by running a `select *` with a limit.
            return super().get_table_sample(table_name)

    def get_schema(self, get_stats=False):
        if not self.configuration.get("loadSchema", False):
            return []

        service = self._get_bigquery_service()
        project_id = self._get_project_id()
        # get a list of Big Query datasets
        datasets_request = service.datasets().list(
            projectId=project_id,
            fields="datasets/datasetReference/datasetId,nextPageToken",
        )
        datasets = []
        while datasets_request:
            # request datasets
            datasets_response = datasets_request.execute()
            # store results
            datasets.extend(datasets_response.get("datasets", []))
            # try loading next page
            datasets_request = service.datasets().list_next(
                datasets_request,
                datasets_response,
            )

        schema = []
        # load all tables for all datasets
        for dataset in datasets:
            dataset_id = dataset["datasetReference"]["datasetId"]
            tables_request = service.tables().list(
                projectId=project_id,
                datasetId=dataset_id,
                fields="tables/tableReference/tableId,nextPageToken",
            )
            while tables_request:
                # request tables with fields above
                tables_response = tables_request.execute()
                for table in tables_response.get("tables", []):
                    # load schema for given table
                    table_data = (
                        service.tables()
                        .get(
                            projectId=project_id,
                            datasetId=dataset_id,
                            tableId=table["tableReference"]["tableId"],
                            fields="id,schema",
                        )
                        .execute()
                    )
                    # build schema data with given table data
                    table_schema = self._get_columns_schema(table_data)
                    schema.append(table_schema)

                # try loading next page of results
                tables_request = service.tables().list_next(
                    tables_request,
                    tables_response,
                )

        return schema

    def run_query(self, query, user):
        logger.debug("BigQuery got query: %s", query)

        bigquery_service = self._get_bigquery_service()
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
            if e.resp.status == 400:
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
