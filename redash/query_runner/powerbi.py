# TODO: test
import logging
from typing import Optional, Tuple

from redash.query_runner import (
    TYPE_BOOLEAN,
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
    BaseHTTPQueryRunner,
    register,
)
from redash.utils import json_dumps, json_loads
from redash.utils.requests_session import UnacceptableAddressException

try:
    import msal
    import numpy
    import pandas

    enabled = True
except ImportError:
    enabled = False

CONVERSIONS = [
    {"pandas_type": numpy.bool_, "redash_type": TYPE_BOOLEAN},
    {
        "pandas_type": numpy.datetime64,
        "redash_type": TYPE_DATETIME,
        "to_redash": lambda x: x.strftime("%Y-%m-%d %H:%M:%S"),
    },
    {"pandas_type": numpy.inexact, "redash_type": TYPE_FLOAT},
    {"pandas_type": numpy.integer, "redash_type": TYPE_INTEGER},
    {"pandas_type": numpy.object, "redash_type": TYPE_STRING},
]


logger = logging.getLogger(__name__)


class PowerBIDAX(BaseHTTPQueryRunner):
    noop_query = """
    EVALUATE
        DATATABLE(
            "Name", STRING, "Region", STRING,
            {
                {"User1", "East"},
                {"User2", "East"},
                {"User3", "West"},
                {"User4", "West"},
                {"User4", "East"}
            }
        )
    """
    response_error = "Power BI returned unexpected status code"
    client_id_title = "Client ID"
    authority_url_title = "Authority URL"
    scope_title = "Scope"
    # client_id = "Enter_the_Application_Id_here"
    # authority_url = 'https://login.microsoftonline.com/yourdomain.com'
    scope = ["https://analysis.windows.net/powerbi/api/.default"]

    requires_authentication = True
    requires_url = False
    url_title = "Power BI URL"
    url = "https://api.powerbi.com/v1.0/myorg"
    # should_annotate_query = False
    username_title = "Username"
    password_title = "Password"

    @classmethod
    def configuration_schema(cls):
        schema = super().configuration_schema()
        properties: dict = schema["properties"]
        properties.update(
            {
                "client_id": {"type": "string", "title": cls.client_id_title},
                "authority_url": {
                    "type": "string",
                    "title": cls.authority_url_title,
                    "default": "https://login.microsoftonline.com/",
                },
                "scope": {
                    "type": "list",
                    "title": cls.scope_title,
                    # "default": ["https://analysis.windows.net/powerbi/api/.default"],
                },
            }
        )
        schema["required"] = schema.get("required", []) + [
            "client_id",
            "authority_url",
            "scope",
        ]
        return schema

    @classmethod
    def name(cls):
        return "Power BI (DAX)"

    @classmethod
    def enabled(cls):
        return enabled

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.syntax = "yaml"

    def test_connection(self):
        _, error = self.get_response("/availableFeatures")
        if error is not None:
            raise Exception(error)

    def get_auth(self):
        client_id = self.configuration["client_id"]
        authority_url = self.configuration["authority_url"]
        scope = self.configuration["scope"]
        # username = self.configuration["username"]
        # password = self.configuration["password"]
        username, password = super().get_auth()
        app = msal.PublicClientApplication(client_id=client_id, authority=authority_url)
        result = app.acquire_token_by_username_password(
            username=username,
            password=password,
            scopes=scope,
        )
        access_token = result["access_token"]
        return f"Bearer {access_token}"

    def get_response(self, url, auth=None, http_method="get", **kwargs):
        url = "{}{}".format(self.configuration["url"], url)
        headers = kwargs.pop("headers", {})
        headers["Accept"] = "application/json"
        headers["Content-Type"] = "application/json"
        # access_token = self._get_access_token()
        # headers["Authorization"] = f"Bearer {access_token}"
        return super().get_response(url, auth, http_method, headers=headers, **kwargs)

    def _build_query(self, query: str) -> Tuple[dict, str, Optional[list]]:
        query: dict = json_loads(query)
        group_id = query.pop("group_id", "")
        dataset_id = query.pop("dataset_id", "")
        query = (
            {
                "queries": [{"query": query.pop("query", "")}],
                "serializerSettings": {"includeNulls": True},
                # "impersonatedUserName": email,
            },
        )
        url = "/groups/{groupId}/datasets/{datasetId}/executeQueries".format_map(
            {
                "groupId": group_id,
                "datasetId": dataset_id,
            }
        )
        return url, query

    @classmethod
    def _parse_results(cls, query_results: dict):
        try:
            rows = query_results.get("results", {}).get("tables", [{}]).get("rows", [])
            df = pandas.from_records(data=rows)
            data = {"columns": [], "rows": []}
            conversions = CONVERSIONS
            labels = []
            for dtype, label in zip(df.dtypes, df.columns):
                for conversion in conversions:
                    if issubclass(dtype.type, conversion["pandas_type"]):
                        data["columns"].append(
                            {
                                "name": label,
                                "friendly_name": label,
                                "type": conversion["redash_type"],
                            }
                        )
                        labels.append(label)
                        func = conversion.get("to_redash")
                        if func:
                            df[label] = df[label].apply(func)
                        break
            data["rows"] = (
                df[labels].replace({numpy.nan: None}).to_dict(orient="records")
            )
            json_data = json_dumps(data)
            error = None
        except KeyboardInterrupt:
            error = "Query cancelled by user."
            json_data = None
        except UnacceptableAddressException:
            error = "Can't query private addresses."
            json_data = None
        except Exception as e:
            error = f"{e}"
            json_data = None
        return json_data, error

    def run_query(self, query, user):
        url, query = self._build_query(query)
        response, error = self.get_response(
            http_method="post",
            url=url,
            json=query,
        )
        query_results = response.json()
        json_data, error = self._parse_results(query_results)
        return json_data, error


register(PowerBIDAX)
