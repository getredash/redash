import datetime
import logging
import json
import sys
import re
import time
from redash.utils import JSONEncoder

try:
    import pymongo
    from bson.objectid import ObjectId
except ImportError:
    print "Missing dependencies. Please install pymongo."
    print "You can use pip:   pip install pymongo"

TYPES_MAP = {
    ObjectId : "string",
    str : "string",
    unicode : "string",
    int : "integer",
    long : "integer",
    float : "float",
    bool : "boolean",
    datetime.datetime: "datetime",
}

date_regex = re.compile("ISODate\(\"(.*)\"\)", re.IGNORECASE)

def mongodb(connection_string):
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

    def query_runner(query):
        if not "dbName" in connection_string or not connection_string["dbName"]:
            return None, "dbName is missing from connection string JSON or is empty"

        db_name = connection_string["dbName"]

        if not "connectionString" in connection_string or not connection_string["connectionString"]:
            return None, "connectionString is missing from connection string JSON or is empty"

        is_replica_set = True if "replicaSetName" in connection_string and connection_string["replicaSetName"] else False

        if is_replica_set:
            if not connection_string["replicaSetName"]:
                return None, "replicaSetName is set in the connection string JSON but is empty"
                
            db_connection = pymongo.MongoReplicaSetClient(connection_string["connectionString"], replicaSet=connection_string["replicaSetName"])
        else:
            db_connection = pymongo.MongoClient(connection_string["connectionString"])

        if db_name not in db_connection.database_names():
            return None, "Unknown database name '%s'" % db_name

        db = db_connection[db_name]

        logging.debug("mongodb connection string: %s", connection_string)
        logging.debug("mongodb got query: %s", query)

        try:
            query_data = json.loads(query)
        except:
            return None, "Invalid query format. The query is not a valid JSON."

        collection = None
        if not "collection" in query_data:
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

        cursor = None
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
                        "type": TYPES_MAP[type(r[k])] if type(r[k]) in TYPES_MAP else None
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

    query_runner.annotate_query = False
    return query_runner
