import json
import logging

import requests

from redash.query_runner import TYPE_INTEGER, TYPE_STRING, TYPE_FLOAT, BaseSQLQueryRunner, register
from redash.utils import JSONEncoder

#Originally written by Github user @klahnakoski
#Original link: https://github.com/klahnakoski/ActiveData-redash-query-runner/blob/c0e7286c09c6f1eb6746a6c7cca581bea79f4757/active_data.py

logger = logging.getLogger(__name__)

types_map = {
    bool: TYPE_INTEGER,
    str: TYPE_STRING,
    unicode: TYPE_STRING,
    dict: TYPE_STRING,
    list: TYPE_STRING,
    int: TYPE_INTEGER,
    long: TYPE_INTEGER,
    float: TYPE_FLOAT
}


class ActiveData(BaseSQLQueryRunner):
    noop_query = "SELECT 1"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "host_url": {
                    "type": "string",
                    "title": "Host URL",
                    "default": "https://activedata.allizom.org:80",
                    "info": "Please include a port. Do not end with a trailing slash."
                },
                "doc_url": {
                    "type": "string",
                    "title": "Documentation URL",
                    "default": "https://github.com/klahnakoski/ActiveData/tree/dev/docs"
                },
                "toggle_table_string": {
                    "type": "string",
                    "title": "Toggle Table String",
                    "default": "_v",
                    "info": "This string will be used to toggle visibility of tables in the schema browser when editing a query in order to remove non-useful tables from sight."
                }
            },
            "required": ["host_url"]
        }

    @classmethod
    def name(cls):
        return "ActiveData"

    @classmethod
    def type(cls):
        return "activedata"

    @classmethod
    def enabled(cls):
        return True

    def _get_tables(self, schema):
        query = {
            "from": "meta.columns",
            "select": [
                "name",
                "table"
            ],
            "where": {"not": {"prefix": {"es_index": "meta."}}},
            "limit": 1000,
            "format": "list"
        }
        results = self.run_jx_query(query, None)

        for row in results['data']:
            table_name = row['table']

            if table_name not in schema:
                schema[table_name] = {'name': table_name, 'columns': []}

            schema[table_name]['columns'].append(row['name'])

        return [{'name': r['name'], 'columns': sorted(r['columns'])} for r in schema.values()]

    def run_jx_query(self, query, user):
        data = json.dumps(query, ensure_ascii=False)
        result = requests.post(self.configuration['host_url']+"/query", data=data)
        response = json.loads(result.content)

        if response.get('type') == "ERROR":
            cause = find_cause(response)
            raise Exception(cause)
        return response

    def run_query(self, annotated_query, user):
        request = {}
        comment, request["sql"] = annotated_query.split("*/", 2)
        meta = request['meta'] = {}
        for kv in comment.strip()[2:].split(","):
            k, v = [s.strip() for s in kv.split(':')]
            meta[k] = v

        logger.debug("Send ActiveData a SQL query: %s", request['sql'])
        data = json.dumps(request, ensure_ascii=False)
        result = requests.post(self.configuration['host_url']+"/sql", data=data)
        response = json.loads(result.content)

        if response.get('type') == "ERROR":
            cause = find_cause(response)
            return None, cause

        output = normalize(response)
        output.update({'data_scanned':'N/A'})
        json_data = json.dumps(output, cls=JSONEncoder)
        return json_data, None



def normalize(table):
    columns = {}  # MAP FROM name TO (MAP FROM type TO (full_name))
    output = []

    def get_unique_name(name, type):
        all_types = columns.get(name)
        if all_types is None:
            all_types = columns[name] = {}
        specific_type = all_types.get(type)
        if specific_type is None:
            if all_types:
                specific_type = all_types[type] = name + "." + type
            else:
                specific_type = all_types[type] = name
        return specific_type

    for r in table['data']:
        new_row = {}
        for i, cname in enumerate(table['header']):
            val = r[i]
            if val is None:
                continue
            type_ = val.__class__
            if isinstance(val, (dict, list)):
                val = json.dumps(val, cls=JSONEncoder)
            col = get_unique_name(cname, types_map.get(type(val), TYPE_STRING))
            new_row[col] = val
        output.append(new_row)

    output_columns = [
        {
            "name": full_name,
            "type": ctype,
            "friendly_name": full_name
        }
        for cname, types in columns.items()
        for ctype, full_name in types.items()
    ]

    return {
        'columns': output_columns,
        'rows': output
    }


def find_cause(e):
    while e.get('cause') is not None:
        c = e['cause']
        if isinstance(c, list):
            e = c[0]
        else:
            e = c
    return e.get('template')

register(ActiveData)
