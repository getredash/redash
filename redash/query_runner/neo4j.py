from redash.query_runner import (
    BaseQueryRunner, 
    register,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_DATETIME,
    TYPE_STRING,
    TYPE_DATE,
    InterruptException,
    JobTimeoutException)
import logging
import os
import threading
from redash.settings import parse_boolean
from redash.utils import json_dumps, json_loads
try:
    from neo4j import GraphDatabase
    enable = True
except:
    enable = False
logger = logging.getLogger(__name__)
types_map = {
    0: TYPE_FLOAT,
    1: TYPE_INTEGER,
    2: TYPE_INTEGER,
    3: TYPE_INTEGER,
    4: TYPE_FLOAT,
    5: TYPE_FLOAT,
    7: TYPE_DATETIME,
    8: TYPE_INTEGER,
    9: TYPE_INTEGER,
    10: TYPE_DATE,
    12: TYPE_DATETIME,
    15: TYPE_STRING,
    16: TYPE_INTEGER,
    246: TYPE_FLOAT,
    253: TYPE_STRING,
    254: TYPE_STRING,
}

class Result(object):
    def __init__(self):
        pass


class Neo4j(BaseQueryRunner):
    noop_query = "MATCH(n) return n.tagline limit 2"
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "uri": {
                    "type": "string"
                },
                "user": {
                    "type": "string"
                },
                "password": {
                    "type": "string"
                },
            },
            "required": ["uri"],
            "secret": ["password"]
        }
    @classmethod
    def enabled(cls):
        return enable
    def _connection(self):
        try:
            auth = None
            user = self.configuration.get("user", "")
            password = self.configuration.get("password", "")
            if user != "" or password != "":
                auth = (user, password)
            driver = GraphDatabase.driver(self.configuration.get("uri", ""), auth=auth )
            return driver
        except Exception as e:
            print(e)
            return None
    def get_schema(self, get_stats=False):
        query = "MATCH (n) RETURN distinct keys(n) as x, labels(n) as y"
        data, error = self.run_query(query, None)
        if error is not None:
            raise Exception("Failed getting schema.")
        results = json_loads(data)
        arr = []
        schema = {}
        for x in results["rows"]:
            table_name = x["y"][0]
            if table_name not in schema:
                schema[table_name] = {'name': table_name, 'columns': []}
            schema[table_name]['columns'] = list(set(schema[table_name]['columns']+x["x"]))
        return list(schema.values())
    def run_query(self, query, user):
        print("testomg")
        ev = threading.Event()
        thread_id = ""
        r = Result()
        t = None
        connection = self._connection()
        try:
            
            # thread_id = connection.thread_id()
            t = threading.Thread(
                target=self._run_query, args=(query, user, connection, r, ev)
            )
            t.start()
            while not ev.wait(1):
                pass
        except (KeyboardInterrupt, InterruptException, JobTimeoutException):
            self._cancel(connection)
            t.join()
            raise

        return r.json_data, r.error
    def _translate_type(self,value):
        if type(value) is int:
            return "integer"
        elif type(value) is float:
            return "float"
        elif type(value) is str:
            return "string"
        elif type(value) is bool:
            return "string"
        else:
            return "string"
    def _run_query(self, query, user, connection, r, ev):
        def read_query(tx, query):
            try:
                result = tx.run(query)
                 
                return result.data()
            except Exception as e:
                print(e)
                raise
        try:
            with connection.session() as session:
                data = session.read_transaction(read_query, query) 
                if data is not None:
                    arr = []
                    for x in data:
                        for v in x.keys():
                            arr.append((v,self._translate_type(x[v])))
                    
                    columns = self.fetch_columns(set(arr))
                    

                    data = {"columns": columns, "rows": data}
                    r.json_data = json_dumps(data)
                    r.error = None
                else:
                    r.json_data = None
                    r.error = "No data was returned."

        except Exception as e:
            r.json_data = None
            r.error = e
        finally:
            ev.set()
            if connection:
                connection.close()
    def _cancel(self, driver):
    
        error = None
        try:
            driver.close()
        except Exception as e:
            error = e

        return error
register(Neo4j)
