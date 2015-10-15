import json
import datetime
import logging
import re
from dateutil.parser import parse

from redash.utils import JSONEncoder
from redash.query_runner import *

logger = logging.getLogger(__name__)

try:
    import pymongo
    from bson.objectid import ObjectId
    from bson.son import SON
    enabled = True

except ImportError:
    enabled = False


TYPES_MAP = {
    str: TYPE_STRING,
    unicode: TYPE_STRING,
    int: TYPE_INTEGER,
    long: TYPE_INTEGER,
    float: TYPE_FLOAT,
    bool: TYPE_BOOLEAN,
    datetime.datetime: TYPE_DATETIME,
}


class MongoDBJSONEncoder(JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)

        return super(MongoDBJSONEncoder, self).default(o)


date_regex = re.compile("ISODate\(\"(.*)\"\)", re.IGNORECASE)


def datetime_parser(dct):
    for k, v in dct.iteritems():
        if isinstance(v, basestring):
            m = date_regex.findall(v)
            if len(m) > 0:
                dct[k] = parse(m[0], yearfirst=True)

    return dct


def parse_query_json(query):
    query_data = json.loads(query, object_hook=datetime_parser)
    return query_data


class MongoDB(BaseQueryRunner):
    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'connectionString': {
                    'type': 'string',
                    'title': 'Connection String'
                },
                'dbName': {
                    'type': 'string',
                    'title': "Database Name"
                },
                'replicaSetName': {
                    'type': 'string',
                    'title': 'Replica Set Name'
                },
            },
            'required': ['connectionString']
        }

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def annotate_query(cls):
        return False

    def __init__(self, configuration_json):
        super(MongoDB, self).__init__(configuration_json)

        self.syntax = 'json'

        self.db_name = self.configuration["dbName"]

        self.is_replica_set = True if "replicaSetName" in self.configuration and self.configuration["replicaSetName"] else False

    def _get_column_by_name(self, columns, column_name):
        for c in columns:
            if "name" in c and c["name"] == column_name:
                return c

        return None


    def run_query(self, query):
        if self.is_replica_set:
            db_connection = pymongo.MongoReplicaSetClient(self.configuration["connectionString"], replicaSet=self.configuration["replicaSetName"])
        else:
            db_connection = pymongo.MongoClient(self.configuration["connectionString"])

        db = db_connection[self.db_name]

        logger.debug("mongodb connection string: %s", self.configuration['connectionString'])
        logger.debug("mongodb got query: %s", query)

        try:
            query_data = parse_query_json(query)
        except ValueError:
            return None, "Invalid query format. The query is not a valid JSON."

        if "collection" not in query_data:
            return None, "'collection' must have a value to run a query"
        else:
            collection = query_data["collection"]

        q = query_data.get("query", None)
        f = None

        aggregate = query_data.get("aggregate", None)
        if aggregate:
            for step in aggregate:
                if "$sort" in step:
                    sort_list = []
                    for sort_item in step["$sort"]:
                        sort_list.append((sort_item["name"], sort_item["direction"]))

                    step["$sort"] = SON(sort_list)

        if not aggregate:
            s = None
            if "sort" in query_data and query_data["sort"]:
                s = []
                for field in query_data["sort"]:
                    s.append((field["name"], field["direction"]))

        if "fields" in query_data:
            f = query_data["fields"]

        s = None
        if "sort" in query_data and query_data["sort"]:
            s = []
            for field_data in query_data["sort"]:
                s.append((field_data["name"], field_data["direction"]))

        columns = []
        rows = []

        cursor = None
        if q or (not q and not aggregate):
            if s:
                cursor = db[collection].find(q, f).sort(s)
            else:
                cursor = db[collection].find(q, f)

            if "skip" in query_data:
                cursor = cursor.skip(query_data["skip"])

            if "limit" in query_data:
                cursor = cursor.limit(query_data["limit"])

        elif aggregate:
            r = db[collection].aggregate(aggregate)

            # Backwards compatibility with older pymongo versions.
            #
            # Older pymongo version would return a dictionary from an aggregate command.
            # The dict would contain a "result" key which would hold the cursor.
            # Newer ones return pymongo.command_cursor.CommandCursor.
            if isinstance(r, dict):
                cursor = r["result"]
            else:
                cursor = r

        for r in cursor:
            for k in r:
                if self._get_column_by_name(columns, k) is None:
                    columns.append({
                        "name": k,
                        "friendly_name": k,
                        "type": TYPES_MAP.get(type(r[k]), TYPE_STRING)
                    })

            rows.append(r)

        if f:
            ordered_columns = []
            for k in sorted(f, key=f.get):
                ordered_columns.append(self._get_column_by_name(columns, k))

            columns = ordered_columns

        data = {
            "columns": columns,
            "rows": rows
        }
        error = None
        json_data = json.dumps(data, cls=MongoDBJSONEncoder)

        return json_data, error

register(MongoDB)
