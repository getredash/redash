import json
import re
import requests
from redash.query_runner import BaseQueryRunner, register
from redash.query_runner import TYPE_STRING, TYPE_INTEGER, TYPE_BOOLEAN, TYPE_FLOAT, TYPE_DATETIME
from redash.utils import json_dumps, json_loads

# Check for required dependencies
try:
    import requests
    enabled = True
except ImportError:
    enabled = False

# Map Python types to Redash types
TYPES_MAP = {
    "str": TYPE_STRING,
    "int": TYPE_INTEGER,
    "float": TYPE_FLOAT,
    "bool": TYPE_BOOLEAN,
    "NoneType": TYPE_STRING
}

def detect_datetime_string(value):
    """Detect if a string value looks like a datetime."""
    if not isinstance(value, str):
        return False

    # Common datetime patterns
    datetime_patterns = [
        r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$',  # 2024-05-03 21:16:13
        r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}',   # 2024-05-03T21:16:13
        r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+$',  # 2024-05-03 21:16:13.123
        r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+',   # 2024-05-03T21:16:13.123
    ]

    for pattern in datetime_patterns:
        if re.match(pattern, value):
            return True
    return False

class D1QueryRunner(BaseQueryRunner):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "cf_url": {
                    "type": "string",
                    "title": "Cloudflare D1 API URL"
                },
                "cf_token": {
                    "type": "string",
                    "title": "Cloudflare API Token"
                }
            },
            "required": ["cf_url", "cf_token"],
            "secret": ["cf_token"]
        }

    @classmethod
    def type(cls):
        return "d1"

    @classmethod
    def name(cls):
        return "Cloudflare D1"

    @classmethod
    def enabled(cls):
        return enabled

    def _query(self, sql, params=None):
        """Helper to run a raw SQL against D1 and return parsed JSON results."""
        headers = {
            "Authorization": f"Bearer {self.configuration.get('cf_token')}",
            "Content-Type": "application/json",
        }
        body = {
            "sql": sql,
            "params": params or []
        }

        try:
            resp = requests.post(
                self.configuration.get("cf_url"),
                headers=headers,
                data=json.dumps(body),
                timeout=30
            )
            resp.raise_for_status()
            data = resp.json()

            # Expected: { "result": [ { "results": [...] } ] }
            results = data.get("result", [])
            if not results:
                return []
            return results[0].get("results", [])

        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to connect to Cloudflare D1: {str(e)}")
        except json.JSONDecodeError as e:
            raise Exception(f"Invalid JSON response from D1: {str(e)}")
        except KeyError as e:
            raise Exception(f"Unexpected response format from D1: {str(e)}")

    def run_query(self, query, user):
        try:
            rows = self._query(query)
            if not rows:
                return {"columns": [], "rows": []}, None

            # Infer columns from first row
            first_row = rows[0]
            columns = []
            for k, v in first_row.items():
                # Get the Python type name and map it to Redash type
                python_type = type(v).__name__
                redash_type = TYPES_MAP.get(python_type, TYPE_STRING)

                # Special handling for strings that look like datetimes
                if python_type == "str" and detect_datetime_string(v):
                    redash_type = TYPE_DATETIME

                columns.append({
                    "name": k,
                    "friendly_name": k,
                    "type": redash_type
                })

            result = {"columns": columns, "rows": rows}
            # Debug: Log the result structure
            print(f"[D1] Query result: {len(rows)} rows, {len(columns)} columns")
            return result, None

        except Exception as e:
            return None, str(e)

    def get_schema(self, get_stats=False):
        """Return schema information for the database."""
        schema = []
        try:
            # Get all tables from sqlite_master
            tables = self._query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_KV'")

            for table in tables:
                table_name = table["name"]
                # Get column information for each table
                columns = self._query(f"PRAGMA table_info({table_name})")
                
                # Extract detailed column information including data types
                column_info = []
                for col in columns:
                    column_info.append({
                        "name": col["name"],
                        "type": col["type"]
                    })

                schema.append({
                    "name": table_name,
                    "columns": column_info
                })

        except Exception as e:
            pass

        return schema

    def test_connection(self):
        query = "SELECT 1 as test"
        _, error = self.run_query(query, None)
        if error:
            raise Exception(error)

register(D1QueryRunner)