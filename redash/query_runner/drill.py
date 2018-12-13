import os
import logging
import requests
import re

from dateutil import parser

from redash.query_runner import BaseQueryRunner, register
from redash.query_runner import TYPE_STRING, TYPE_DATETIME, TYPE_INTEGER, TYPE_FLOAT, TYPE_BOOLEAN
from redash.utils import json_dumps, json_loads

logger = logging.getLogger(__name__)


# Drill returns request result as strings, so we have to guess the actual column type
def guess_type(string_value):
    if string_value == '' or string_value is None:
        return TYPE_STRING

    try:
        int(string_value)
        return TYPE_INTEGER
    except (ValueError, OverflowError):
        pass

    try:
        float(string_value)
        return TYPE_FLOAT
    except (ValueError, OverflowError):
        pass

    if unicode(string_value).lower() in ('true', 'false'):
        return TYPE_BOOLEAN

    try:
        parser.parse(string_value)
        return TYPE_DATETIME
    except (ValueError, OverflowError):
        pass

    return TYPE_STRING


# Convert Drill string value to actual type
def convert_type(string_value, actual_type):
    if string_value is None or string_value == '':
        return ''

    if actual_type == TYPE_INTEGER:
        return int(string_value)

    if actual_type == TYPE_FLOAT:
        return float(string_value)

    if actual_type == TYPE_BOOLEAN:
        return unicode(string_value).lower() == 'true'

    if actual_type == TYPE_DATETIME:
        return parser.parse(string_value)

    return unicode(string_value)


# Parse Drill API response and translate it to accepted format
def parse_response(data):
    cols = data['columns']
    rows = data['rows']

    if len(cols) == 0:
        return {'columns': [], 'rows': []}

    first_row = rows[0]
    columns = []
    types = {}

    for c in cols:
        columns.append({'name': c, 'type': guess_type(first_row[c]), 'friendly_name': c})

    for col in columns:
        types[col['name']] = col['type']

    for row in rows:
        for key, value in row.iteritems():
            row[key] = convert_type(value, types[key])

    return {'columns': columns, 'rows': rows}


class Drill(BaseQueryRunner):
    noop_query = 'select version from sys.version'

    @classmethod
    def name(cls):
        return 'Apache Drill'

    @classmethod
    def type(cls):
        return 'drill'

    @classmethod
    def enabled(cls):
        return True

    @classmethod
    def configuration_schema(cls):
        schema = {
            'type': 'object',
            'properties': {
                'username': {
                    'type': 'string',
                    'title': 'Username',
                },
                'password': {
                    'type': 'string',
                    'title': 'Password',
                },
                'url': {
                    'type': 'string',
                    'title': 'Drill URL',
                },
                # Since Drill itself can act as aggregator of various datasources,
                # it can contain quite a lot of schemas in `INFORMATION_SCHEMA`
                # We added this to improve user experience and let users focus only on desired schemas.
                'allowed_schemas': {
                    'type': 'string',
                    'title': 'List of schemas to use in schema browser (comma separated)'
                }
            },
            'order': ['url', 'username', 'password', 'allowed_schemas'],
            'required': ['url'],
            'secret': ['password']
        }
        return schema

    def get_auth(self):
        username = self.configuration.get('username')
        password = self.configuration.get('password')
        if username and password:
            return (username, password)
        else:
            return None

    def get_response(self, url, auth=None, **kwargs):
        # Get authentication values if not given
        if auth is None:
            auth = self.get_auth()

        # Then call requests to get the response from the given endpoint
        # URL optionally, with the additional requests parameters.
        error = None
        response = None
        try:
            response = requests.post(url, auth=auth, **kwargs)
            # Raise a requests HTTP exception with the appropriate reason
            # for 4xx and 5xx response status codes which is later caught
            # and passed back.
            response.raise_for_status()

            # Any other responses (e.g. 2xx and 3xx):
            if response.status_code != 200:
                error = '{} ({}).'.format(
                    'Drill returned unexpected status code',
                    response.status_code,
                )

        except requests.HTTPError as exc:
            logger.exception(exc)
            error = (
                'Failed to execute query. '
                'Return Code: {} Reason: {}'.format(
                    response.status_code,
                    response.text
                )
            )
        except requests.RequestException as exc:
            # Catch all other requests exceptions and return the error.
            logger.exception(exc)
            error = str(exc)

        # Return response and error.
        return response, error

    def run_query(self, query, user):
        drill_url = os.path.join(self.configuration['url'], 'query.json')

        try:
            payload = {'queryType': 'SQL', 'query': query}

            response, error = self.get_response(drill_url, json=payload)
            if error is not None:
                return None, error

            results = parse_response(response.json())

            return json_dumps(results), None
        except KeyboardInterrupt:
            return None, 'Query cancelled by user.'

    def get_schema(self, get_stats=False):

        query = """
        SELECT DISTINCT 
            TABLE_SCHEMA, 
            TABLE_NAME, 
            COLUMN_NAME 
        FROM 
            INFORMATION_SCHEMA.`COLUMNS` 
        WHERE 
                TABLE_SCHEMA not in ('INFORMATION_SCHEMA', 'information_schema', 'sys') 
            and TABLE_SCHEMA not like '%.information_schema' 
            and TABLE_SCHEMA not like '%.INFORMATION_SCHEMA' 
            
        """
        allowed_schemas = self.configuration.get('allowed_schemas')
        if allowed_schemas:
            query += "and TABLE_SCHEMA in ({})".format(', '.join(map(lambda x: "'{}'".format(re.sub('[^a-zA-Z0-9_.`]', '', x)), allowed_schemas.split(','))))

        results, error = self.run_query(query, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json_loads(results)

        schema = {}

        for row in results['rows']:
            table_name = u'{}.{}'.format(row['TABLE_SCHEMA'], row['TABLE_NAME'])

            if table_name not in schema:
                schema[table_name] = {'name': table_name, 'columns': []}

            schema[table_name]['columns'].append(row['COLUMN_NAME'])

        return schema.values()


register(Drill)

