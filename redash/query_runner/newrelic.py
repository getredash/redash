try:
    import requests
    import pandas as pd
    enabled = True
except ImportError:
    enabled = False

from redash.query_runner import BaseQueryRunner, register
from redash.query_runner import TYPE_STRING, TYPE_INTEGER, TYPE_BOOLEAN, TYPE_FLOAT, TYPE_DATE, TYPE_DATETIME
from redash.utils import json_dumps

TYPES_MAP = {
    "bool": TYPE_BOOLEAN,
    "datetime64[ns]": TYPE_DATETIME,
    "datetime64[s]": TYPE_DATETIME,
    "float64": TYPE_FLOAT,
    "int64": TYPE_INTEGER,
    "object": TYPE_STRING
}

class NewRelic(BaseQueryRunner):
    noop_query = "SELECT 1"

    def run_query(self, query, user):
        headers = {
            "Accept": "application/json",
            "API-Key": self.configuration.get("personal_api_key") or None
        }
        url = "https://api.newrelic.com/graphql"
        data = '{ actor { account(id: ' + self.configuration.get("account_id") + ') { nrql(query: \"' + query.replace("\n", " ") + '\") { results } } } }'
        
        response = requests.get(url, headers = headers, data = data)
        response_parsed = response.json()["data"]["actor"]["account"]["nrql"]["results"]

        df = pd.DataFrame(response_parsed)
        
        if 'beginTimeSeconds' in df.columns:
            df['Time'] = pd.to_datetime(df['beginTimeSeconds'], unit='s')
            df = df.drop('beginTimeSeconds', axis=1)
            df.insert(0, 'Time', df.pop('Time'))
        if 'endTimeSeconds' in df.columns:
            df = df.drop('endTimeSeconds', axis=1)
            
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

        return json_dumps({
            "columns": columns,
            "rows": rows
        }), None

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "personal_api_key": {"type": "string", "title": "Personal API Key"},
                "account_id": {"type": "string", "title": "Account ID"},
                "region": {"type": "string"},
            },
            "order": ["personal_api_key", "account_id", "region"],
            "required": ["personal_api_key", "account_id"],
            "secret": ["personal_api_key", "account_id"],
        }
    
    @classmethod
    def enabled(cls):
        return enabled
    
    @classmethod
    def name(cls):
        return "New Relic (NerdGraph)"

register(NewRelic)