# TODO: test
import logging
from typing import Optional, Tuple
from enum import Enum

import yaml


class AuthType(Enum):
    CREDENTIALS = 1
    LOGIN_PASSWORD = 2


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
    noop_query = """# yaml
    group_id:
    dataset_id:
    query: |
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
    should_annotate_query = False
    response_error = "Power BI returned unexpected status code"
    client_id_title = "Client ID"
    authority_url_title = "Authority URL"
    scopes_title = "Scopes"

    requires_authentication = True
    requires_url = False
    url_title = "Power BI URL"
    username_title = "Username"
    password_title = "Password/Token"
    default_url = "https://api.powerbi.com/v1.0/myorg"
    default_scopes = '["https://analysis.windows.net/powerbi/api/.default"]'
    default_authority_url = (
        "https://login.microsoftonline.com/<tenant name/yourdomain.com>"
    )

    @classmethod
    def configuration_schema(cls):
        schema = super().configuration_schema()
        properties: dict = schema["properties"]
        properties["url"].update({"default": cls.default_url})
        properties.update(
            {
                "client_id": {"type": "string", "title": cls.client_id_title},
                "authority_url": {
                    "type": "string",
                    "title": cls.authority_url_title,
                    "default": cls.default_authority_url,
                },
                "scopes": {
                    "type": "string",
                    "title": cls.scopes_title,
                    "default": cls.default_scopes,
                },
            }
        )
        schema["required"] = schema.get("required", []) + [
            "client_id",
            "authority_url",
        ]
        schema["required"].remove("username")
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
        self.configuration["url"] = self.configuration.get("url", self.default_url)
        scopes = self.configuration.get("scopes", self.default_scopes)
        self.configuration["scopes"] = scopes

    def test_connection(self):
        _, error = self.get_response("/availableFeatures")
        if error is not None:
            raise Exception(error)

    def get_auth(self):
        return None

    def get_credentials(self):
        username = self.configuration.get("username")
        password = self.configuration.get("password")
        if password:
            return (username, password)
        if self.requires_authentication:
            raise ValueError("Username and Password or Token required")
        else:
            return None

    def get_authorization(self):
        client_id = self.configuration["client_id"]
        authority_url = self.configuration["authority_url"]
        self.configuration["scopes_array"] = json_loads(self.configuration["scopes"])
        scopes = self.configuration["scopes_array"]
        username, password = self.get_credentials()
        if self.configuration.get("username") is None:
            self.auth_type = AuthType.CREDENTIALS
        else:
            self.auth_type = AuthType.LOGIN_PASSWORD
        if self.auth_type == AuthType.CREDENTIALS:
            app = msal.ConfidentialClientApplication(
                authority=authority_url,
                client_id=client_id,
                client_credential=password,
            )
            result = app.acquire_token_for_client(
                scopes=scopes,
            )
        elif self.auth_type == AuthType.LOGIN_PASSWORD:
            app = msal.PublicClientApplication(
                authority=authority_url,
                client_id=client_id,
            )
            result = app.acquire_token_by_username_password(
                username=username,
                password=password,
                scopes=scopes,
            )
        if "error" in result:
            raise ValueError(f"Couldn't acquire token: {result}")
        access_token = result["access_token"]
        logger.debug(result)
        return f"Bearer {access_token}"

    def get_response(self, url: str, auth=None, http_method="get", **kwargs):
        url = "{}{}".format(self.configuration["url"], url)
        headers = kwargs.pop("headers", {})
        headers["Accept"] = "application/json"
        headers["Content-Type"] = "application/json"
        headers["Authorization"] = self.get_authorization()
        return super().get_response(url, auth, http_method, headers=headers, **kwargs)

    def _build_query(self, query: str) -> Tuple[dict, str, Optional[list]]:
        query_dict: dict = yaml.safe_load(query)
        group_id = query_dict.get("group_id")
        dataset_id = query_dict.get("dataset_id")
        json_body = {
            "queries": [{"query": query_dict.get("query", "")}],
            "serializerSettings": {"includeNulls": True},
            # "impersonatedUserName": email,
        }

        if dataset_id is None:
            raise ValueError("dataset_id can't be empty")
        url = (
            "" if group_id is None else f"/groups/{group_id}"
        ) + f"/datasets/{dataset_id}" "/executeQueries"
        return url, json_body

    @classmethod
    def _parse_results(cls, query_results: dict):
        try:
            rows = (
                query_results.get("results", [{}])[0]
                .get("tables", [{}])[0]
                .get("rows", [])
            )
            df = pandas.DataFrame.from_records(data=rows)
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
        url, json_body = self._build_query(query)
        response, error = self.get_response(
            http_method="post",
            url=url,
            json=json_body,
        )
        response.raise_for_status()
        query_results = response.json()
        json_data, error = self._parse_results(query_results)
        return json_data, error


register(PowerBIDAX)
