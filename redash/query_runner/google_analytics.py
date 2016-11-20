from base64 import b64decode
import json
import logging
from redash.query_runner import *
from redash.utils import JSONEncoder
from urlparse import urlparse, parse_qs
from datetime import datetime
logger = logging.getLogger(__name__)

try:
    import gspread
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
)


class GoogleAnalytics(BaseQueryRunner):
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

    def _get_analytics_service(self):
        scope = ['https://www.googleapis.com/auth/analytics.readonly']
        key = json.loads(b64decode(self.configuration['jsonKeyFile']))
        credentials = SignedJwtAssertionCredentials(key['client_email'], key["private_key"], scope=scope)
        return build('analytics', 'v3', http=credentials.authorize(httplib2.Http()))

    def run_query(self, query, user):
        logger.info("Analytics is about to execute query: %s", query)
        params = parse_qs(urlparse(query).query, keep_blank_values=True)
        for key in params.keys():
            params[key] = ','.join(params[key])
            if '-' in key:
                params[key.replace('-', '_')] = params.pop(key)
        if len(params) > 0:
            response = self._get_analytics_service().data().ga().get(**params).execute()
            columns = [{'name': h['name'], 'friendly_name': h['name'].split(':')[1],
                        'type': types_conv.get(h['dataType'], 'string')} for h in response['columnHeaders']]
            rows = []
            for r in response['rows']:
                d = {}
                for c, value in enumerate(r):
                    d[response['columnHeaders'][c]['name']] = value
                rows.append(d)
            data = {'columns': columns, 'rows': rows}
            error = None
            json_data = json.dumps(data, cls=JSONEncoder)
        else:
            error = 'Wrong query format'
            json_data = None
        return json_data, error

register(GoogleAnalytics)
