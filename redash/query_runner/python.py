import sys
import json

from redash.query_runner import *
from redash import models


def get_query_result(query_id):
    try:
        query = models.Query.get_by_id(query_id)
    except models.Query.DoesNotExist:
        raise Exception("Query id %s does not exist." % query_id)

    if query.latest_query_data is None:
        raise Exception("Query does not have results yet.")

    if query.latest_query_data.data is None:
        raise Exception("Query does not have results yet.")

    return json.loads(query.latest_query_data.data)


def execute_query(data_source_name, query):
    try:
        data_source = models.DataSource.get(models.DataSource.name==data_source_name)
    except models.DataSource.DoesNotExist:
        raise Exception("Wrong data source name: %s." % data_source_name)

    query_runner = get_query_runner(data_source.type, data_source.options)

    data, error = query_runner.run_query(query)
    if error is not None:
        raise Exception(error)

    # TODO: allow avoiding the json.dumps/loads in same process
    return json.loads(data)


class Python(BaseQueryRunner):
    """
    This is very, very unsafe. Use at your own risk with people you really trust.
    """
    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
            }
        }

    @classmethod
    def annotate_query(cls):
        return False

    def __init__(self, configuration_json):
        super(Python, self).__init__(configuration_json)

    def run_query(self, query):
        try:
            error = None

            script_globals = {'get_query_result': get_query_result, 'execute_query': execute_query}
            script_locals = {'result': None}
            # TODO: timeout, sandboxing
            exec query in script_globals, script_locals

            if script_locals['result'] is None:
                raise Exception("result wasn't set to value.")

            json_data = json.dumps(script_locals['result'])
        except KeyboardInterrupt:
            error = "Query cancelled by user."
            json_data = None
        except Exception as e:
            raise sys.exc_info()[1], None, sys.exc_info()[2]

        return json_data, error

register(Python)
