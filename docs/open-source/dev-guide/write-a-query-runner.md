---
title: Writing a New Query Runner
---

## Intro

Redash already connects to [many](/help/data-sources/querying/supported-data-sources/) databases and REST APIs. To add support for a new data source type in Redash, you need to implement a Query Runner for it. A Query Runner is a Python class. This doc page shows the process of writing a new Query Runner. It uses the Firebolt Query Runner as an example.

Start by creating a new `firebolt.py` file in the `/redash/query_runner` directory and implement the `BaseQueryRunner` class:

```python
from redash.query_runner import BaseQueryRunner, register

class Firebolt(BaseQueryRunner):
    def run_query(self, query, user):
        pass
```

The only method that you must implement is the `run_query` method, which accepts a `query` parameter (string) and the `user` who invoked this query. The user is irrelevant for most query runners and can be ignored.

## Configuration

Usually the Query Runner needs some configuration to be used, so for this we need to implement the `configuration_schema` class method. The fields belong under the `properties` key:

```python
@classmethod
def configuration_schema(cls):
    return {
        "type": "object",
        "properties": {
            "api_endpoint": {"type": "string", "default": DEFAULT_API_URL},
            "engine_name": {"type": "string"},
            "DB": {"type": "string"},
            "user": {"type": "string"},
            "password": {"type": "string"}
        },
        "order": ["user", "password", "api_endpoint", "engine_name", "DB"],
        "required": ["user", "password", "engine_name", "DB"],
        "secret": ["password"],
    }
```

This method returns a JSON schema object.

Each property must specify a `type`. The supported types for the properties are `string`, `number` and `boolean`. For file-like fields, see the next heading.

Optionally you may also specify a `default` value and `title` that will be displayed in the UI. If you do not specify a `title` the property name will be used. Properties without a default will be blank.

Also note the `required` field which defines the required properties (all of them except `api_endpoint` in this case) and `secret`, which defines the secret fields (which won’t be sent back to the UI).

Values for these settings are accessible as a dictionary on the `self.configuration` field of the Query Runner object.

### File uploads

When a user creates an instance of your data source, Redash stores the configuration in its metadata database. Some data sources will require users to upload a file (for example an SSL certificate or key file). To handle this, define the property with a name ending in `File` of type `string`. For example:

```python
    "properties": {
        "someFile": {"type": "string"},
    }
```

The Redash front-end renders any property of type `string` whose name ends with `File` as a file-upload picker component. When saved, the contents of the file will be encrypted and saved to the metadata database as bytes. In your Query Runner code, you can read the value of `self.configuration['someFile']` into one of Python's built-in `tempfile` library fixtures. From there you can handle these bytes as you would any file stored on disk. You can see an example of this in the PostgreSQL Query Runner code.

## Executing the query

Now that we defined the configuration we can implement the `run_query` method:

```python
def run_query(self, query, user):
    connection = connect(
        api_endpoint=(self.configuration.get("api_endpoint") or DEFAULT_API_URL),
        engine_name=(self.configuration.get("engine_name") or None),
        username=(self.configuration.get("user") or None),
        password=(self.configuration.get("password") or None),
        database=(self.configuration.get("DB") or None),
    )

    cursor = connection.cursor()

    try:
        cursor.execute(query)
        columns = self.fetch_columns(
            [(i[0], TYPES_MAP.get(i[1], None)) for i in cursor.description]
        )
        rows = [
            dict(zip((column["name"] for column in columns), row)) for row in cursor
        ]

        data = {"columns": columns, "rows": rows}
        error = None
        json_data = json_dumps(data)
    finally:
        connection.close()

    return json_data, error
```

This is the minimum required code. Here's what it does:

1. Connect to the the configured Firebolt endpoint or use the `DEFAULT_API_URL` which is imported from the official Firebolt Python API client.
2. Run the query.
3. Transform the results into the format Redash [expects](/help/data-sources/querying/json-api/#Required-Data-Structure).

## Mapping Column Types to Redash Types

Note these lines:

```python
columns = self.fetch_columns(
    [(i[0], TYPES_MAP.get(i[1], None)) for i in cursor.description]
)
```

The `BaseQueryRunner` includes a helper function (`fetch_columns`) which de-duplicates column names and assigns a type (if known) to the column. If no type is assigned, the default is string. The `TYPES_MAP` dictionary is a custom one we define at the top of the file. It will be different from one Query Runner to the next.

The return value of the `run_query` method is a tuple of the JSON encoded results and error string. The error string is used in case you want to return some kind of custom error message, otherwise you can let the exceptions propagate (this is useful when first developing your Query Runner).

## Fetching Database Schema

Up to this point, we've shown the minimum required to run a query. If you also want Redash to show the database schema and enable autocomplete, you need to implement the `get_schema` method:

```python
def get_schema(self, get_stats=False):
    query = """
    SELECT TABLE_SCHEMA,
            TABLE_NAME,
            COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA <> 'INFORMATION_SCHEMA'
    """

    results, error = self.run_query(query, None)

    if error is not None:
        raise Exception("Failed getting schema.")

    schema = {}
    results = json_loads(results)

    for row in results["rows"]:
        table_name = "{}.{}".format(row["table_schema"], row["table_name"])

        if table_name not in schema:
            schema[table_name] = {"name": table_name, "columns": []}

        schema[table_name]["columns"].append(row["column_name"])

    return list(schema.values())
```

The implementation of `get_schema` is specific to the data source you’re adding support to but the return value needs to be an array of dictionaries, where each dictionary has a `name` key (table name) and `columns` key (array of column names as strings).

### Including Column Types in the Schema Browser

If you want the Redash schema browser to also show column types, you can adjust your `get_schema` method so that the `columns` key contains an array of dictionaries with the keys `name` and `type`.

Here is an example without column types:

```json
[
  {
    "name": "Table1",
    "columns": ["field1", "field2", "field3"]
  }
]
```

Here is an example that includes column types:

```json
[
  {
    "name": "Table1",
    "columns": [
      {
        "name": "field1",
        "type": "VARCHAR"
      },
      {
        "name": "field2",
        "type": "BIGINT"
      },
      {
        "name": "field3",
        "type": "DATE"
      }
    ]
  }
]
```

Note that the column type string is meant only to assist query authors. If it is present in the output of `get_schema` Redash trusts it and does not compare it to the type information returned by `run_query`. It is possible, therefore, that the type shown in the schema browser is different from the column type at the database. We recommend testing manually against a known schema to ensure that the correct types appear in the schema browser.

## Adding Test Connection Support

You can also implement the Test Connection button support. The Test Connection button appears on the data source setup and configuration screen. You can either supply a `noop_query` property on your Query Runner or implement the `test_connection` method yourself. In this example we opted for the first:

```python
class Firebolt(BaseQueryRunner):
    noop_query = "SELECT 1"
```

## Supporting Auto Limit for SQL Databases

The Redash front-end includes a tick box to automatically limit query results. This helps avoid overloading the Redash web app with large result sets. For most SQL style databases, you can automatically add auto limit support by inheriting `BaseSQLQueryRunner` instead of `BaseQueryRunner`.

```python
from redash.query_runner import BaseSQLQueryRunner, register

class Firebolt(BaseSQLQueryRunner):
    def run_query(self, query, user):
        pass
```

The `BaseSQLQueryRunner` uses `sqplarse` to intelligently append `LIMIT 1000` to a query prior to execution, as long as the tick box in the query editor is selected. For databases that use a different syntax (notably Microsoft SQL Server or any NoSQL database), you can continue to inherit `BaseQueryRunner` and implement the following:

```python
@property
def supports_auto_limit(self):
    return True

def apply_auto_limit(self, query_text: str, should_apply_auto_limit: bool):
    ...
```

For the `BaseQueryRunner`, the `supports_auto_limit` property is false by default and `apply_auto_limit` returns the query text unmodified.

## Checking for Required Dependencies

If the Query Runner needs some external Python packages, we wrap those imports with a try/except block, to prevent crashing deployments where this package is not available:

```python
try:
    from firebolt.db import connect
    from firebolt.client import DEFAULT_API_URL
    enabled = True
except ImportError:
    enabled = False
```

The enabled variable is later used in the Query Runner’s enabled class method:

```python
@classmethod
def enabled(cls):
    return enabled
```

If it returns False the Query Runner won’t be enabled.

## Finishing up

At the top of your file, import the `register` function and call it at the bottom of `firebolt.py`

```python
# top of file

try:
    from firebolt.db import connect
    from firebolt.client import DEFAULT_API_URL
    enabled = True
except ImportError:
    enabled = False

from redash.query_runner import BaseQueryRunner, register
from redash.query_runner import TYPE_STRING, TYPE_INTEGER, TYPE_BOOLEAN
from redash.utils import json_dumps, json_loads

TYPES_MAP = {1: TYPE_STRING, 2: TYPE_INTEGER, 3: TYPE_BOOLEAN}

# ... implementation

# bottom of file
register(Firebolt)
```

Usually the connector will need to have some additional Python packages, we add those to the `requirements_all_ds.txt` file. If the required Python packages don’t have any special dependencies (like some system packages), we usually add the query runner to the `default_query_runners` in `redash/settings/__init__.py`.

You can see the full pull request for the Firebolt query runner [here](https://github.com/getredash/redash/pull/5689).

## Summary

A Redash Query runner is a Python class that, at minimum, implements a `run_query` method that returns results in the format Redash expects. Configurable data source settings are defined by the `configuration_schema` class method which returns a JSON schema. You may optionally implement a connection test, schema fetching, and automatic limits. You can enable your data source by adding it to the `default_query_runners` list in settings, or by setting the `ADDITIONAL_QUERY_RUNNERS` environment variable.
