import json
import logging
import sys

from redash.query_runner import *
from redash.utils import JSONEncoder

logger = logging.getLogger(__name__)

try:
    from impala.dbapi import connect
    from impala.error import DatabaseError, RPCError
    enabled = True
except ImportError, e:
    enabled = False

COLUMN_NAME = 0
COLUMN_TYPE = 1

types_map = {
    'BIGINT': TYPE_INTEGER,
    'TINYINT': TYPE_INTEGER,
    'SMALLINT': TYPE_INTEGER,
    'INT': TYPE_INTEGER,
    'DOUBLE': TYPE_FLOAT,
    'DECIMAL': TYPE_FLOAT,
    'FLOAT': TYPE_FLOAT,
    'REAL': TYPE_FLOAT,
    'BOOLEAN': TYPE_BOOLEAN,
    'TIMESTAMP': TYPE_DATETIME,
    'CHAR': TYPE_STRING,
    'STRING': TYPE_STRING,
    'VARCHAR': TYPE_STRING
}


class Impala(BaseSQLQueryRunner):
    noop_query = "show schemas"

    @classmethod
    def name(cls):
        return "Impala"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "host": {
                    "type": "string",
                    "title": "Host: The hostname for HS2. For Impala, this can be any of the `impalad`s. For Hive, this is the Hive Metastore."
                },
                "port": {
                    "type": "number",
                    "title": "Port: The port number. The Impala default is 21050. The Hive default is 10000."
                },
                "protocol": {
                    "type": "string",
                    "default": "hiveserver2",
                    "title": "Protocol: Please specify 'hiveserver2' only"
                },
                "database": {
                    "type": "string",
                    "title": "Default Database: If `None`, the result is implementation-dependent."
                },
                "use_ssl": {
                    "type": "boolean",
                    "title": "Use SSL?"
                },
                "ca_cert": {
                    "type": "string",
                    "title": "Local path to the the third-party CA certificate. If SSL is enabled but the certificate is not specified, the server certificate will not be validated."
                },
                "auth_mechanism": {
                    "type": "string",
                    "default": "NOSASL",
                    "title": "Authentication Mechanism: `'NOSASL'` for unsecured Impala. `'PLAIN'` for unsecured Hive (because Hive requires the SASL transport). `'GSSAPI'` for Kerberos. `'LDAP'` for LDAP."
                },
                "user": {
                    "type": "string",
                    "title": "User: (if applicable)"
                },
                "password": {
                    "type": "string",
                    "title": "Password: (if applicable)"
                },
                "kerberos_service_name": {
                    "type": "string",
                    "default": "impala",
                    "title": "Kerberos Service Name: Authenticate to a particular `impalad` service principal. Uses `'impala'` by default."
                },
                "use_kerberos": {
                    "type": "boolean",
                    "title": "Use Kerberos? (deprecated): Specify `auth_mechanism='GSSAPI'` instead."
                },
                "use_ldap": {
                    "type": "boolean",
                    "title": "Use LDAP? (deprecated): Specify `auth_mechanism='LDAP'` instead."
                },
                "ldap_user": {
                    "type": "string",
                    "title": "LDAP User (deprecated): Use `user` parameter instead."
                },
                "ldap_password": {
                    "type": "string",
                    "title": "LDAP Password (deprecated): Use `password` parameter instead."
                },
                "timeout": {
                    "type": "number",
                    "title": "Connection timeout in seconds. Default is no timeout."
                }
            },
            "order": ["host","port","protocol","database","use_ssl","ca_cert","auth_mechanism","user","password","kerberos_service_name","use_kerberos","use_ldap","ldap_user","ldap_password","timeout"],
            "required": ["host"],
            "secret": ["password", "ldap_password"]
        }

    @classmethod
    def annotate_query(cls):
        return True

    @classmethod
    def type(cls):
        return "impala"

    def __init__(self, configuration):
        super(Impala, self).__init__(configuration)

    def _get_tables(self, schema_dict):
        schemas_query = "show schemas;"
        tables_query = "show tables in %s;"
        columns_query = "show column stats %s.%s;"

        for schema_name in map(lambda a: unicode(a['name']), self._run_query_internal(schemas_query)):
            for table_name in map(lambda a: unicode(a['name']), self._run_query_internal(tables_query % schema_name)):
                columns = map(lambda a: unicode(a['Column']), self._run_query_internal(columns_query % (schema_name, table_name)))

                if schema_name != 'default':
                    table_name = '{}.{}'.format(schema_name, table_name)

                schema_dict[table_name] = {'name': table_name, 'columns': columns}

        return schema_dict.values()

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

                columns.append({
                    'name': column_name,
                    'friendly_name': column_name,
                    'type': types_map.get(column[COLUMN_TYPE], None)
                })

            rows = [dict(zip(column_names, row)) for row in cursor]

            data = {'columns': columns, 'rows': rows}
            json_data = json.dumps(data, cls=JSONEncoder)
            error = None
            cursor.close()
        except DatabaseError as e:
            json_data = None
            error = e.message
        except RPCError as e:
            json_data = None
            error = "Metastore Error [%s]" % e.message
        except KeyboardInterrupt:
            connection.cancel()
            error = "Query cancelled by user."
            json_data = None
        finally:
            if connection:
                connection.close()

        return json_data, error


class HiveImpala(Impala):

    @classmethod
    def name(cls):
        return "Hive via Impala"

    @classmethod
    def annotate_query(cls):
        # True works for Impala, but it must be False to also allow connectivity with Hive.
        return False

    @classmethod
    def type(cls):
        return "hiveimpala"


register(Impala)
register(HiveImpala)
