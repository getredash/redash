import time
import requests
import logging
from io import StringIO

from redash.query_runner import BaseQueryRunner, register
from redash.query_runner import TYPE_STRING
from redash.utils import json_dumps

try:
    import qds_sdk
    from qds_sdk.qubole import Qubole as qbol
    from qds_sdk.commands import Command, HiveCommand
    from qds_sdk.commands import SqlCommand, PrestoCommand

    enabled = True
except ImportError:
    enabled = False


class Qubole(BaseQueryRunner):
    should_annotate_query = False

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "query_type": {
                    "type": "string",
                    "title": "Query Type (quantum / presto / hive)",
                    "default": "hive",
                },
                "endpoint": {
                    "type": "string",
                    "title": "API Endpoint",
                    "default": "https://api.qubole.com",
                },
                "token": {"type": "string", "title": "Auth Token"},
                "cluster": {
                    "type": "string",
                    "title": "Cluster Label",
                    "default": "default",
                },
            },
            "order": ["query_type", "endpoint", "token", "cluster"],
            "required": ["endpoint", "token"],
            "secret": ["token"],
        }

    @classmethod
    def type(cls):
        return "qubole"

    @classmethod
    def name(cls):
        return "Qubole"

    @classmethod
    def enabled(cls):
        return enabled

    def test_connection(self):
        headers = self._get_header()
        r = requests.head(
            "%s/api/latest/users" % self.configuration.get("endpoint"), headers=headers
        )
        r.status_code == 200

    def run_query(self, query, user):
        qbol.configure(
            api_token=self.configuration.get("token"),
            api_url="%s/api" % self.configuration.get("endpoint"),
        )

        try:
            query_type = self.configuration.get("query_type", "hive")

            if query_type == "quantum":
                cmd = SqlCommand.create(query=query)
            elif query_type == "hive":
                cmd = HiveCommand.create(
                    query=query, label=self.configuration.get("cluster")
                )
            elif query_type == "presto":
                cmd = PrestoCommand.create(
                    query=query, label=self.configuration.get("cluster")
                )
            else:
                raise Exception(
                    "Invalid Query Type:%s.\
                        It must be : hive / presto / quantum."
                    % self.configuration.get("query_type")
                )

            logging.info(
                "Qubole command created with Id: %s and Status: %s", cmd.id, cmd.status
            )

            while not Command.is_done(cmd.status):
                time.sleep(qbol.poll_interval)
                cmd = Command.find(cmd.id)
                logging.info("Qubole command Id: %s and Status: %s", cmd.id, cmd.status)

            rows = []
            columns = []
            error = None

            if cmd.status == "done":
                fp = StringIO()
                cmd.get_results(
                    fp=fp,
                    inline=True,
                    delim="\t",
                    fetch=False,
                    qlog=None,
                    arguments=["true"],
                )

                results = fp.getvalue()
                fp.close()

                data = results.split("\r\n")
                columns = self.fetch_columns(
                    [(i, TYPE_STRING) for i in data.pop(0).split("\t")]
                )
                rows = [
                    dict(zip((column["name"] for column in columns), row.split("\t")))
                    for row in data
                ]

            json_data = json_dumps({"columns": columns, "rows": rows})
        except KeyboardInterrupt:
            logging.info("Sending KILL signal to Qubole Command Id: %s", cmd.id)
            cmd.cancel()
            error = "Query cancelled by user."
            json_data = None

        return json_data, error

    def get_schema(self, get_stats=False):
        schemas = {}
        try:
            headers = self._get_header()
            content = requests.get(
                "%s/api/latest/hive?describe=true&per_page=10000"
                % self.configuration.get("endpoint"),
                headers=headers,
            )
            data = content.json()

            for schema in data["schemas"]:
                tables = data["schemas"][schema]
                for table in tables:
                    table_name = list(table.keys())[0]
                    columns = [f["name"] for f in table[table_name]["columns"]]

                    if schema != "default":
                        table_name = "{}.{}".format(schema, table_name)

                    schemas[table_name] = {"name": table_name, "columns": columns}

        except Exception as e:
            logging.error(
                "Failed to get schema information from Qubole. Error {}".format(str(e))
            )

        return list(schemas.values())

    def _get_header(self):
        return {
            "Content-type": "application/json",
            "Accept": "application/json",
            "X-AUTH-TOKEN": self.configuration.get("token"),
        }


register(Qubole)
