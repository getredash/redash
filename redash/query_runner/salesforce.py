import re
import logging
from collections import OrderedDict
from redash.query_runner import BaseQueryRunner, register
from redash.query_runner import (
    TYPE_STRING,
    TYPE_DATE,
    TYPE_DATETIME,
    TYPE_INTEGER,
    TYPE_FLOAT,
    TYPE_BOOLEAN,
)
from redash.utils import json_dumps

logger = logging.getLogger(__name__)

try:
    from simple_salesforce import Salesforce as SimpleSalesforce, SalesforceError
    from simple_salesforce.api import DEFAULT_API_VERSION

    enabled = True
except ImportError as e:
    enabled = False

# See https://developer.salesforce.com/docs/atlas.en-us.api.meta/api/field_types.htm
TYPES_MAP = dict(
    id=TYPE_STRING,
    string=TYPE_STRING,
    currency=TYPE_FLOAT,
    reference=TYPE_STRING,
    double=TYPE_FLOAT,
    picklist=TYPE_STRING,
    date=TYPE_DATE,
    url=TYPE_STRING,
    phone=TYPE_STRING,
    textarea=TYPE_STRING,
    int=TYPE_INTEGER,
    datetime=TYPE_DATETIME,
    boolean=TYPE_BOOLEAN,
    percent=TYPE_FLOAT,
    multipicklist=TYPE_STRING,
    masterrecord=TYPE_STRING,
    location=TYPE_STRING,
    JunctionIdList=TYPE_STRING,
    encryptedstring=TYPE_STRING,
    email=TYPE_STRING,
    DataCategoryGroupReference=TYPE_STRING,
    combobox=TYPE_STRING,
    calculated=TYPE_STRING,
    anyType=TYPE_STRING,
    address=TYPE_STRING,
)

# Query Runner for Salesforce SOQL Queries
# For example queries, see:
# https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_soql_select_examples.htm


class Salesforce(BaseQueryRunner):
    should_annotate_query = False

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "username": {"type": "string"},
                "password": {"type": "string"},
                "token": {"type": "string", "title": "Security Token"},
                "sandbox": {"type": "boolean"},
                "api_version": {
                    "type": "string",
                    "title": "Salesforce API Version",
                    "default": DEFAULT_API_VERSION,
                },
            },
            "required": ["username", "password", "token"],
            "secret": ["password", "token"],
        }

    def test_connection(self):
        response = self._get_sf().describe()
        if response is None:
            raise Exception("Failed describing objects.")
        pass

    def _get_sf(self):
        sf = SimpleSalesforce(
            username=self.configuration["username"],
            password=self.configuration["password"],
            security_token=self.configuration["token"],
            sandbox=self.configuration.get("sandbox", False),
            version=self.configuration.get("api_version", DEFAULT_API_VERSION),
            client_id="Redash",
        )
        return sf

    def _clean_value(self, value):
        if isinstance(value, OrderedDict) and "records" in value:
            value = value["records"]
            for row in value:
                row.pop("attributes", None)
        return value

    def _get_value(self, dct, dots):
        for key in dots.split("."):
            if dct is not None and key in dct:
                dct = dct.get(key)
            else:
                dct = None
        return dct

    def _get_column_name(self, key, parents=[]):
        return ".".join(parents + [key])

    def _build_columns(self, sf, child, parents=[]):
        child_type = child["attributes"]["type"]
        child_desc = sf.__getattr__(child_type).describe()
        child_type_map = dict((f["name"], f["type"]) for f in child_desc["fields"])
        columns = []
        for key in child.keys():
            if key != "attributes":
                if isinstance(child[key], OrderedDict) and "attributes" in child[key]:
                    columns.extend(self._build_columns(sf, child[key], parents + [key]))
                else:
                    column_name = self._get_column_name(key, parents)
                    key_type = child_type_map.get(key, "string")
                    column_type = TYPES_MAP.get(key_type, TYPE_STRING)
                    columns.append((column_name, column_type))
        return columns

    def _build_rows(self, columns, records):
        rows = []
        for record in records:
            record.pop("attributes", None)
            row = dict()
            for column in columns:
                key = column[0]
                value = self._get_value(record, key)
                row[key] = self._clean_value(value)
            rows.append(row)
        return rows

    def run_query(self, query, user):
        logger.debug("Salesforce is about to execute query: %s", query)
        query = re.sub(r"/\*(.|\n)*?\*/", "", query).strip()
        try:
            columns = []
            rows = []
            sf = self._get_sf()
            response = sf.query_all(query)
            records = response["records"]
            if response["totalSize"] > 0 and len(records) == 0:
                columns = self.fetch_columns([("Count", TYPE_INTEGER)])
                rows = [{"Count": response["totalSize"]}]
            elif len(records) > 0:
                cols = self._build_columns(sf, records[0])
                rows = self._build_rows(cols, records)
                columns = self.fetch_columns(cols)
            error = None
            data = {"columns": columns, "rows": rows}
            json_data = json_dumps(data)
        except SalesforceError as err:
            error = err.content
            json_data = None
        return json_data, error

    def get_schema(self, get_stats=False):
        sf = self._get_sf()
        response = sf.describe()
        if response is None:
            raise Exception("Failed describing objects.")

        schema = {}
        for sobject in response["sobjects"]:
            table_name = sobject["name"]
            if sobject["queryable"] is True and table_name not in schema:
                desc = sf.__getattr__(sobject["name"]).describe()
                fields = desc["fields"]
                schema[table_name] = {
                    "name": table_name,
                    "columns": [f["name"] for f in fields],
                }
        return list(schema.values())


register(Salesforce)
