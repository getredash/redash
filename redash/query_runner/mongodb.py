import json
import datetime
import logging
import re
import time

from redash.utils import JSONEncoder
from redash.query_runner import *

logger = logging.getLogger(__name__)


def _import():
    try:
        import pymongo
        from bson.objectid import ObjectId
        return True

    except ImportError:
        logger.warning("Missing dependencies. Please install pymongo.")
        logger.warning("You can use pip:   pip install pymongo")

    return False


TYPES_MAP = {
    str: TYPE_STRING,
    unicode: TYPE_STRING,
    int: TYPE_INTEGER,
    long: TYPE_INTEGER,
    float: TYPE_FLOAT,
    bool: TYPE_BOOLEAN,
    datetime.datetime: TYPE_DATETIME,
}

date_regex = re.compile("ISODate\(\"(.*)\"\)", re.IGNORECASE)


def _get_column_by_name(columns, column_name):
    for c in columns:
        if "name" in c and c["name"] == column_name:
            return c

    return None


def _convert_date(q, field_name):
    m = date_regex.findall(q[field_name])
    if len(m) > 0:
        if q[field_name].find(":") == -1:
            q[field_name] = datetime.datetime.fromtimestamp(time.mktime(time.strptime(m[0], "%Y-%m-%d")))
        else:
            q[field_name] = datetime.datetime.fromtimestamp(time.mktime(time.strptime(m[0], "%Y-%m-%d %H:%M")))


class MongoDB(BaseQueryRunner):
    @classmethod
    def configuration_fields(cls):
        return "connectionString", "dbName", "replicaSetName"

    @classmethod
    def enabled(cls):
        return _import()

    @classmethod
    def annotate_query(cls):
        return False

    def __init__(self, configuration_json):
        _import()
        super(MongoDB, self).__init__(configuration_json)

        if "dbName" not in self.configuration or not connection_string["dbName"]:
            raise ConfigurationError("dbName is missing from connection string")

        self.db_name = self.configuration["dbName"]

        if "connectionString" not in self.configuration or not self.configuration["connectionString"]:
            raise ConfigurationError("connectionString is missing from connection string")

        self.is_replica_set = True if "replicaSetName" in self.configuration and self.configuration["replicaSetName"] else False

        if self.is_replica_set and not self.configuration["replicaSetName"]:
            raise ConfigurationError("replicaSetName is set in the connection string JSON but is empty")


    def run_query(self, query):
        if self.is_replica_set:
            db_connection = pymongo.MongoReplicaSetClient(self.configuration["connectionString"], replicaSet=self.configuration["replicaSetName"])
        else:
            db_connection = pymongo.MongoClient(self.configuration["connectionString"])

        if self.db_name not in db_connection.database_names():
            return None, "Unknown database name '%s'" % self.db_name

        db = db_connection[self.db_name ]

        logger.debug("mongodb connection string: %s", self.configuration['connectionString'])
        logger.debug("mongodb got query: %s", query)

        try:
            query_data = json.loads(query)
        except ValueError:
            return None, "Invalid query format. The query is not a valid JSON."

        if "collection" not in query_data:
            return None, "'collection' must have a value to run a query"
        else:
            collection = query_data["collection"]

        q = None
        if "query" in query_data:
            q = query_data["query"]
            for k in q:
                if q[k] and type(q[k]) in [str, unicode]:
                    logging.debug(q[k])
                    _convert_date(q, k)
                elif q[k] and type(q[k]) is dict:
                    for k2 in q[k]:
                        if type(q[k][k2]) in [str, unicode]:
                            _convert_date(q[k], k2)

        f = None
        if "fields" in query_data:
            f = query_data["fields"]

        s = None
        if "sort" in query_data and query_data["sort"]:
            s = []
            for field_name in query_data["sort"]:
                s.append((field_name, query_data["sort"][field_name]))

        columns = []
        rows = []

        error = None
        json_data = None

        if s:
            cursor = db[collection].find(q, f).sort(s)
        else:
            cursor = db[collection].find(q, f)

        for r in cursor:
            for k in r:
                if _get_column_by_name(columns, k) is None:
                    columns.append({
                        "name": k,
                        "friendly_name": k,
                        "type": TYPES_MAP.get(type(r[k]), TYPE_STRING)
                    })

                # Convert ObjectId to string
                if type(r[k]) == ObjectId:
                    r[k] = str(r[k])

            rows.append(r)

        if f:
            ordered_columns = []
            for k in sorted(f, key=f.get):
                ordered_columns.append(_get_column_by_name(columns, k))

            columns = ordered_columns

        data = {
            "columns": columns,
            "rows": rows
        }
        error = None
        json_data = json.dumps(data, cls=JSONEncoder)

        return json_data, error

register("mongo", MongoDB)