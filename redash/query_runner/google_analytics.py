# -*- coding: utf-8 -*-

from base64 import b64decode
import json
import logging
from redash.query_runner import *
from redash.utils import JSONEncoder
from urlparse import urlparse, parse_qs
from datetime import datetime
logger = logging.getLogger(__name__)

try:
    from oauth2client.client import SignedJwtAssertionCredentials
    from apiclient.discovery import build
    import httplib2
    enabled = True
except ImportError as e:
    logger.info(str(e))
    enabled = False


def _load_key(filename):
    with open(filename, "rb") as f:
        return json.loads(f.read())


types_conv = dict(
    STRING=TYPE_STRING,
    INTEGER=TYPE_INTEGER,
    FLOAT=TYPE_FLOAT,
    DATE=TYPE_DATE,
    DATETIME=TYPE_DATETIME
)


class GoogleAnalytics(BaseSQLQueryRunner):
    @classmethod
    def annotate_query(cls):
        return False

    @classmethod
    def type(cls):
        return "google_analytics"

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'jsonKeyFile': {
                    "type": "string",
                    'title': 'JSON Key File'
                }
            },
            'required': ['jsonKeyFile'],
            'secret': ['jsonKeyFile']
        }

    def __init__(self, configuration):
        super(GoogleAnalytics, self).__init__(configuration)

    def _get_tables(self, schema):
        accounts = self._get_analytics_service().management().accounts().list().execute().get('items')
        if accounts is None:
            raise Exception("Failed getting accounts.")
        else:
            for account in accounts:
                schema[account['name']] = {'name': account['name'], 'columns': []}
                properties = self._get_analytics_service().management().webproperties().list(
                    accountId=account['id']).execute().get('items', [])
                for property_ in properties:
                    schema[account['name']]['columns'].append(
                        u'{0} (ga:{1})'.format(property_['name'], property_['defaultProfileId'])
                    )
        return schema.values()

    def _get_analytics_service(self):
        scope = ['https://www.googleapis.com/auth/analytics.readonly']
        key = json.loads(b64decode(self.configuration['jsonKeyFile']))
        credentials = SignedJwtAssertionCredentials(key['client_email'], key["private_key"], scope=scope)
        return build('analytics', 'v3', http=credentials.authorize(httplib2.Http()))

    def run_query(self, query, user):
        logger.debug("Analytics is about to execute query: %s", query)
        try:
            params = json.loads(query)
        except:
            params = parse_qs(urlparse(query).query, keep_blank_values=True)
            for key in params.keys():
                params[key] = ','.join(params[key])
                if '-' in key:
                    params[key.replace('-', '_')] = params.pop(key)
        if len(params) > 0:
            response = self._get_analytics_service().data().ga().get(**params).execute()
            columns = []
            for h in response['columnHeaders']:
                if h['name'] == 'ga:date':
                    h['dataType'] = 'DATE'
                elif h['name'] == 'ga:dateHour':
                    h['dataType'] = 'DATETIME'
                columns.append({
                    'name': h['name'],
                    'friendly_name': h['name'].split(':', 1)[1],
                    'type': types_conv.get(h['dataType'], 'string')
                })
            rows = []
            for r in response['rows']:
                d = {}
                for c, value in enumerate(r):
                    column_name = response['columnHeaders'][c]['name']
                    column_type = filter(lambda col: col['name'] == column_name, columns)[0]['type']
                    if column_type == TYPE_DATE:
                        value = datetime.strptime(value, '%Y%m%d')
                    elif column_type == TYPE_DATETIME:
                        if len(value) == 10:
                            value = datetime.strptime(value, '%Y%m%d%H')
                        elif len(value) == 12:
                            value = datetime.strptime(value, '%Y%m%d%H%M')
                        else:
                            raise Exception("Unknown date/time format in results: '{}'".format(value))
                    d[column_name] = value
                rows.append(d)
            data = {'columns': columns, 'rows': rows}
            error = None
            json_data = json.dumps(data, cls=JSONEncoder)
        else:
            error = 'Wrong query format'
            json_data = None
        return json_data, error

register(GoogleAnalytics)
