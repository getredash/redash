import logging

from redash.query_runner import *
from redash.utils import json_dumps

logger = logging.getLogger(__name__)

try:
    from impala.dbapi import connect
    from impala.error import DatabaseError, RPCError

    enabled = True
except ImportError as e:
    enabled = False

COLUMN_NAME = 0
COLUMN_TYPE = 1

types_map = {
    "BIGINT": TYPE_INTEGER,
    "TINYINT": TYPE_INTEGER,
    "SMALLINT": TYPE_INTEGER,
    "INT": TYPE_INTEGER,
    "DOUBLE": TYPE_FLOAT,
    "DECIMAL": TYPE_FLOAT,
    "FLOAT": TYPE_FLOAT,
    "REAL": TYPE_FLOAT,
    "BOOLEAN": TYPE_BOOLEAN,
    "TIMESTAMP": TYPE_DATETIME,
    "CHAR": TYPE_STRING,
    "STRING": TYPE_STRING,
    "VARCHAR": TYPE_STRING,
}


class Impala(BaseSQLQueryRunner):
    noop_query = "show schemas"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "host": {"type": "string"},
                "port": {"type": "number"},
                "protocol": {
                    "type": "string",
                    "extendedEnum": [
                        {"value": "beeswax", "name": "Beeswax"},
                        {"value": "hiveserver2", "name": "Hive Server 2"},
                    ],
                    "title": "Protocol",
                },
                "database": {"type": "string"},
                "use_ldap": {"type": "boolean"},
                "ldap_user": {"type": "string"},
                "ldap_password": {"type": "string"},
                "timeout": {"type": "number"},
            },
            "required": ["host"],
            "secret": ["ldap_password"],
        }

    @classmethod
    def type(cls):
        return "impala"

    def _get_tables(self, schema_dict):
        schemas_query = "show schemas;"
        tables_query = "show tables in %s;"
        columns_query = "show column stats %s.%s;"

        for schema_name in [
            str(a["name"]) for a in self._run_query_internal(schemas_query)
        ]:
            for table_name in [
                str(a["name"])
                for a in self._run_query_internal(tables_query % schema_name)
            ]:
                columns = [
                    str(a["Column"])
                    for a in self._run_query_internal(
                        columns_query % (schema_name, table_name)
                    )
                ]

                if schema_name != "default":
                    table_name = "{}.{}".format(schema_name, table_name)

                schema_dict[table_name] = {"name": table_name, "columns": columns}

        return list(schema_dict.values())

    def run_query(self, query, user):

        connection = None
        try:
            connection = connect(**self.configuration.to_dict())

            cursor = connection.cursor()

            cursor.execute(query)

            column_names = []
            columns = []

            for column in cursor.description:
                column_name = column[COLUMN_NAME]
                column_names.append(column_name)

                columns.append(
                    {
                        "name": column_name,
                        "friendly_name": column_name,
                        "type": types_map.get(column[COLUMN_TYPE], None),
                    }
                )

            rows = [dict(zip(column_names, row)) for row in cursor]

            data = {"columns": columns, "rows": rows}
            json_data = json_dumps(data)
            error = None
            cursor.close()
        except DatabaseError as e:
            json_data = None
            error = str(e)
        except RPCError as e:
            json_data = None
            error = "Metastore Error [%s]" % str(e)
        except KeyboardInterrupt:
            connection.cancel()
            error = "Query cancelled by user."
            json_data = None
        finally:
            if connection:
                connection.close()

        return json_data, error


register(Impala)
