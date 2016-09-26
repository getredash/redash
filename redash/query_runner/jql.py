import json
import requests

from collections import OrderedDict

from redash.query_runner import *


# TODO: make this more general and move into __init__.py
class ResultSet(object):
    def __init__(self):
        self.columns = OrderedDict()
        self.rows = []

    def add_row(self, row):
        for key in row.keys():
            self.add_column(key)

        self.rows.append(row)

    def add_column(self, column, column_type=TYPE_STRING):
        if column not in self.columns:
            self.columns[column] = {'name': column, 'type': column_type, 'friendly_name': column}

    def to_json(self):
        return json.dumps({'rows': self.rows, 'columns': self.columns.values()})


def parse_issue(issue):
    result = OrderedDict()
    result['key'] = issue['key']

    for k, v in issue['fields'].iteritems():
        if k.startswith('customfield_'):
            continue

        if isinstance(v, dict):
            if 'key' in v:
                result['{}_key'.format(k)] = v['key']
            if 'name' in v:
                result['{}_name'.format(k)] = v['name']

            if k in v:
                result[k] = v[k]

            if 'watchCount' in v:
                result[k] = v['watchCount']
        # elif isinstance(v, list):
        #     pass
        else:
            result[k] = v

    return result


def parse_issues(data):
    results = ResultSet()

    for issue in data['issues']:
        results.add_row(parse_issue(issue))

    return results


def parse_count(data):
    results = ResultSet()
    results.add_row({'count': data['total']})
    return results


class JiraJQL(BaseQueryRunner):
    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'url': {
                    'type': 'string',
                    'title': 'JIRA URL'
                },
                'username': {
                    'type': 'string',
                },
                'password': {
                    'type': 'string'
                }
            },
            'required': ['url', 'username', 'password'],
            'secret': ['password']
        }

    @classmethod
    def name(cls):
        return "JIRA (JQL)"

    @classmethod
    def annotate_query(cls):
        return False

    def __init__(self, configuration):
        super(JiraJQL, self).__init__(configuration)
        self.syntax = 'json'

    def run_query(self, query_string):
        jql_url = '{}/rest/api/2/search'.format(self.configuration["url"])

        try:
            query = json.loads(query_string)
            query_type = query.pop('queryType', 'select')

            if query_type == 'count':
                query['maxResults'] = 1
                query['fields'] = ''

            response = requests.get(jql_url, params=query, auth=(self.configuration.get('username'), self.configuration.get('password')))

            if response.status_code == 401 or response.status_code == 403:
                return None, "Authentication error. Please check username/password."

            if response.status_code != 200:
                return None, "JIRA returned unexpected status code ({})".format(response.status_code)

            data = response.json()

            if query_type == 'count':
                results = parse_count(data)
            else:
                results = parse_issues(data)

            return results.to_json(), None
        except KeyboardInterrupt:
            return None, "Query cancelled by user."

register(JiraJQL)

