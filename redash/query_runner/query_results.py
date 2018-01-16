import json
import logging
import numbers
import re
import sqlite3

from dateutil import parser

from redash import models
from redash.permissions import has_access, not_view_only
from redash.query_runner import (TYPE_BOOLEAN, TYPE_DATETIME, TYPE_FLOAT,
                                 TYPE_INTEGER, TYPE_STRING, BaseQueryRunner,
                                 register)
from redash.utils import JSONEncoder

logger = logging.getLogger(__name__)


class PermissionError(Exception):
    pass


def _guess_type(value):
    if value == '' or value is None:
        return TYPE_STRING

    if isinstance(value, numbers.Integral):
        return TYPE_INTEGER

    if isinstance(value, float):
        return TYPE_FLOAT

    if unicode(value).lower() in ('true', 'false'):
        return TYPE_BOOLEAN

    try:
        parser.parse(value)
        return TYPE_DATETIME
    except (ValueError, OverflowError):
        pass

    return TYPE_STRING


def extract_query_ids(query):
    queries = re.findall(r'(?:join|from)\s+query_(\d+)', query, re.IGNORECASE)
    return [int(q) for q in queries]


def _load_query(user, query_id):
    query = models.Query.get_by_id(query_id)

    if user.org_id != query.org_id:
        raise PermissionError("Query id {} not found.".format(query.id))

    if not has_access(query.data_source.groups, user, not_view_only):
        raise PermissionError(u"You are not allowed to execute queries on {} data source (used for query id {}).".format(
            query.data_source.name, query.id))

    return query


def create_tables_from_query_ids(user, connection, query_ids):
    for query_id in set(query_ids):
        query = _load_query(user, query_id)

        results, error = query.data_source.query_runner.run_query(
            query.query_text, user)

        if error:
            raise Exception(
                "Failed loading results for query id {}.".format(query.id))

        results = json.loads(results)
        table_name = 'query_{query_id}'.format(query_id=query_id)
        create_table(connection, table_name, results)


def fix_column_name(name):
    return name.replace(':', '_').replace('.', '_').replace(' ', '_')


def create_table(connection, table_name, query_results):
    columns = [column['name']
               for column in query_results['columns']]
    safe_columns = [fix_column_name(column) for column in columns]

    column_list = ", ".join(safe_columns)
    create_table = u"CREATE TABLE {table_name} ({column_list})".format(
        table_name=table_name, column_list=column_list)
    logger.debug("CREATE TABLE query: %s", create_table)
    connection.execute(create_table)

    insert_template = u"insert into {table_name} ({column_list}) values ({place_holders})".format(
        table_name=table_name,
        column_list=column_list,
        place_holders=','.join(['?'] * len(columns)))

    for row in query_results['rows']:
        values = [row.get(column) for column in columns]
        connection.execute(insert_template, values)


class Results(BaseQueryRunner):
    noop_query = 'SELECT 1'

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
            }
        }

    @classmethod
    def annotate_query(cls):
        return False

    @classmethod
    def name(cls):
        return "Query Results (Beta)"

    def run_query(self, query, user):
        connection = sqlite3.connect(':memory:')

        query_ids = extract_query_ids(query)
        create_tables_from_query_ids(user, connection, query_ids)

        cursor = connection.cursor()

        try:
            cursor.execute(query)

            if cursor.description is not None:
                columns = self.fetch_columns(
                    [(i[0], None) for i in cursor.description])

                rows = []
                column_names = [c['name'] for c in columns]

                for i, row in enumerate(cursor):
                    for j, col in enumerate(row):
                        guess = _guess_type(col)

                        if columns[j]['type'] is None:
                            columns[j]['type'] = guess
                        elif columns[j]['type'] != guess:
                            columns[j]['type'] = TYPE_STRING

                    rows.append(dict(zip(column_names, row)))

                data = {'columns': columns, 'rows': rows}
                error = None
                json_data = json.dumps(data, cls=JSONEncoder)
            else:
                error = 'Query completed but it returned no data.'
                json_data = None
        except KeyboardInterrupt:
            connection.cancel()
            error = "Query cancelled by user."
            json_data = None
        finally:
            connection.close()
        return json_data, error


register(Results)
