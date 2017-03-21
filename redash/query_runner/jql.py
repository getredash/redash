import json
import requests
import re

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


def parse_issue(issue, field_mapping):
    result = OrderedDict()
    result['key'] = issue['key']

    for k, v in issue['fields'].iteritems():#
        output_name = field_mapping.get_output_field_name(k)
        member_names = field_mapping.get_dict_members(k)

        if isinstance(v, dict):
            if len(member_names) > 0:
                # if field mapping with dict member mappings defined get value of each member
                for member_name in member_names:
                    if member_name in v:
                        result[field_mapping.get_dict_output_field_name(k,member_name)] = v[member_name]

            else:
                # these special mapping rules are kept for backwards compatibility
                if 'key' in v:
                    result['{}_key'.format(output_name)] = v['key']
                if 'name' in v:
                    result['{}_name'.format(output_name)] = v['name']

                if k in v:
                    result[output_name] = v[k]

                if 'watchCount' in v:
                    result[output_name] = v['watchCount']
        
        elif isinstance(v, list):
            if len(member_names) > 0:
                # if field mapping with dict member mappings defined get value of each member
                for member_name in member_names:
                    listValues = []
                    for listItem in v:
                        if isinstance(listItem, dict):
                            if member_name in listItem:
                                listValues.append(listItem[member_name])
                    if len(listValues) > 0:
                        result[field_mapping.get_dict_output_field_name(k,member_name)] = ','.join(listValues)

            else:
                # otherwise support list values only for non-dict items
                listValues = []
                for listItem in v:
                    if not isinstance(listItem, dict):
                        listValues.append(listItem)
                if len(listValues) > 0:
                    result[output_name] = ','.join(listValues)

        else:
            result[output_name] = v

    return result


def parse_issues(data, field_mapping):
    results = ResultSet()

    for issue in data['issues']:
        results.add_row(parse_issue(issue, field_mapping))

    return results


def parse_count(data):
    results = ResultSet()
    results.add_row({'count': data['total']})
    return results


class FieldMapping:

    def __init__(cls, query_field_mapping):
        cls.mapping = []
        for k, v in query_field_mapping.iteritems():
            field_name = k
            member_name = None
            
            # check for member name contained in field name
            member_parser = re.search('(\w+)\.(\w+)', k)
            if (member_parser):
                field_name = member_parser.group(1)
                member_name = member_parser.group(2)

            cls.mapping.append({
                'field_name': field_name,
                'member_name': member_name,
                'output_field_name': v
                })

    def get_output_field_name(cls,field_name):
        for item in cls.mapping:
            if item['field_name'] == field_name and not item['member_name']:
                return item['output_field_name']
        return field_name

    def get_dict_members(cls,field_name):
        member_names = []
        for item in cls.mapping:
            if item['field_name'] == field_name and item['member_name']:
                member_names.append(item['member_name'])
        return member_names

    def get_dict_output_field_name(cls,field_name, member_name):
        for item in cls.mapping:
            if item['field_name'] == field_name and item['member_name'] == member_name:
                return item['output_field_name']
        return None


class JiraJQL(BaseQueryRunner):
    noop_query = '{"queryType": "count"}'

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

    def run_query(self, query, user):
        jql_url = '{}/rest/api/2/search'.format(self.configuration["url"])

        try:
            query = json.loads(query)
            query_type = query.pop('queryType', 'select')
            field_mapping = FieldMapping(query.pop('fieldMapping', {}))

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
                results = parse_issues(data, field_mapping)

            return results.to_json(), None
        except KeyboardInterrupt:
            return None, "Query cancelled by user."

register(JiraJQL)

