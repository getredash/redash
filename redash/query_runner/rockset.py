import requests
import os
from redash.query_runner import *
from redash.utils import JSONEncoder
import logging
import json

logger = logging.getLogger(__name__)

class Rockset(BaseSQLQueryRunner):
#class Rockset:
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "apiserver": {
                    "type": "string",
                    "default": "https://api.rs2.usw2.rockset.com"
                },
                "apikey": {
                    "type": "string",
                },
            },
            "required": ["apiserver", "apikey"],
            "secret": ["apikey"]
        }

    @classmethod
    def type(cls):
        return "rockset"

    def _get_tables(self, schema):
        for col in self.list():
            table_name = col['name']
            describe = self.query('DESCRIBE "{}"'.format(table_name))
            columns = list(set(map(lambda x: x['field'][0], describe['results'])))
            schema[table_name] = {'name': table_name, 'columns': columns}
        return schema.values()

    def _get_type(self, value):
        if isinstance(value, int):
            return TYPE_INTEGER
        elif isinstance(value, float):
            return TYPE_FLOAT
        elif isinstance(value, bool):
            return TYPE_BOOLEAN
        elif isinstance(value, str):
            return TYPE_STRING
        return TYPE_STRING

    def run_query(self, query, user):
        logger.info('Rockset running query: %s', query)
        results = self.query(query)
        if 'code' in results and results['code'] != 200:
            return None, '{}: {}'.format(results['type'], results['message'])
        rows = results['results']
        columns = []
        if len(rows) > 0:
            columns = []
            for k in rows[0]:
                columns.append({'name': k, 'friendly_name': k, 'type': self._get_type(rows[0][k])})
        data = json.dumps({'columns': columns, 'rows': rows}, cls=JSONEncoder)
        return data, None

    # ####### BELOW ARE ROCKSET-SPECIFIC METHODS ########
    def _request(self, endpoint, method='GET', body=None):
        apikey = self.configuration['apikey']
        apiserver = self.configuration['apiserver']
        headers = {'Authorization': 'ApiKey {}'.format(apikey)}
        if method == 'GET':
            r =  requests.get('{}/v1/orgs/self/{}'.format(apiserver, endpoint),
                                headers=headers)
            return r.json()
        elif method == 'POST':
            r =  requests.post('{}/v1/orgs/self/{}'.format(apiserver, endpoint),
                                headers=headers, json=body)
            return r.json()
        else:
            raise 'Unknown method {}'.format(method)

    def list(self):
        response = self._request('ws/commons/collections')
        return response['data']

    def query(self, sql):
        return self._request('queries', 'POST', {'sql': {'query': sql}})

register(Rockset)

if __name__ == '__main__':
    rs = Rockset()
    rs.configuration={'apiserver': 'https://api.rs2.usw2.rockset.com', 'apikey': os.environ['APIKEY']}
    schema={}
    print(rs._get_tables(schema))
