import pandas as pd
from redash.query_runner import BaseQueryRunner, register
from redash.query_runner import TYPE_STRING, TYPE_INTEGER, TYPE_BOOLEAN, TYPE_FLOAT, TYPE_DATE, TYPE_DATETIME
from redash.utils import json_dumps, json_loads
import splunklib.client  as client
import splunklib.results as results
import requests
import json
import time
import logging
from redash.query_runner import *

TYPES_MAP = {
    "bool": TYPE_BOOLEAN,
    "datetime64[ns]": TYPE_DATETIME,
    "datetime64[s]": TYPE_DATETIME,
    "float64": TYPE_FLOAT,
    "int64": TYPE_INTEGER,
    "object": TYPE_STRING
}

logger = logging.getLogger(__name__)

class Splunk(BaseQueryRunner):

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "splunk_url": {"type": "string", "title": "Splunk Server URL"},
                "username": {"type": "string", "title": "Username"},
                "password": {"type": "string", "title": "Password", "secret": True}#,
                # "Use-SSL": {"type": "boolean", "title": "Use SSL", "default": True}
            },
            "required": ["splunk_url", "username", "password"],
            "order": ["splunk_url", "username", "password"]
        }
    
    # @classmethod
    # def annotate_query(cls):

    def test_connection(self):
        # host = self.configuration_schema['splunk_url']
        # username = self.configuration_schema['username']
        # password = self.configuration_schema['password']
        service = client.connect(
        host=(self.configuration.get("splunk_url") or None),
        username=(self.configuration.get("username") or None),
        password=(self.configuration.get("password") or None)
        )

        # for index in service.indexes:
        #     logger.info("Splunk Index: %s", index.name)

        # for app in service.apps:
        #     logger.info("Splunk Application: %s", app.name)

        # query = "search * | head 10"
        # result = service.jobs.oneshot(query)
        # reader = results.ResultsReader(result)
        # df = pd.DataFrame(reader)
        # logger.info("DataFrame: %s", df.to_string())
        # columns = []
        # rows = df.to_dict('records')

        # for col in df.columns:
        #     columns.append(
        #         {
        #             "name": col,
        #             "friendly_name": col,
        #             "type": TYPES_MAP[str(df[col].dtype)]
        #         }
        #     )
        
        # for i in reader:
        #     logger.info("-----------Result-------------")
        #     for key, value in i.items():
        #         logger.info("Key: %s, Value: %s", key, value)

        service.logout()

    
    def run_query(self, query, user):
        query = query.split("*/ ",1)[1]
        logger.info("Query: %s", query)
        service = client.connect(
        host=(self.configuration.get("splunk_url") or None),
        username=(self.configuration.get("username") or None),
        password=(self.configuration.get("password") or None)
        )

        try:
            result = service.jobs.oneshot(query)
            reader = results.ResultsReader(result)
            df = pd.DataFrame(reader)
            logger.info("DataFrame: %s", df.to_string())
            columns = []
            rows = df.to_dict('records')

            for col in df.columns:
                columns.append(
                    {
                        "name": col,
                        "friendly_name": col,
                        "type": TYPES_MAP[str(df[col].dtype)]
                    }
                )

            data = {"columns": columns, "rows": rows}
            error = None
            json_data = json_dumps(data)
        except (SyntaxError, RuntimeError) as e:
            error = e.message
            json_data = None
        finally:
            service.logout()

        return json_data, error
    
register(Splunk)