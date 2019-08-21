from redash.query_runner import BaseQueryRunner, register
from redash.query_runner import TYPE_STRING, TYPE_DATE, TYPE_DATETIME, TYPE_INTEGER, TYPE_FLOAT, TYPE_BOOLEAN
from redash.utils import json_dumps, json_loads


try:
    from azure.kusto.data.request import KustoClient, KustoConnectionStringBuilder
    from azure.kusto.data.exceptions import KustoServiceError
    enabled = True
except ImportError:
    enabled = False

TYPES_MAP = {
    'boolean': TYPE_BOOLEAN,
    'datetime': TYPE_DATETIME,
    'date': TYPE_DATE,
    'dynamic': TYPE_STRING,
    'guid': TYPE_STRING,
    'int': TYPE_INTEGER,
    'long': TYPE_INTEGER,
    'real': TYPE_FLOAT,
    'string': TYPE_STRING,
    'timespan': TYPE_STRING,
    'decimal': TYPE_FLOAT
}


class AzureKusto(BaseQueryRunner):
    noop_query = "let noop = datatable (Noop:string)[1]; noop"

    @classmethod
    def configuration_schema(cls):
        return {
            "type":
            "object",
            "properties": {
                "Cluster": {
                    "type": "string"
                },
                "Azure AD Client ID": {
                    "type": "string"
                },
                "Azure AD Client Secret": {
                    "type": "string"
                },
                "Azure AD Tenant Id": {
                    "type": "string"
                },
                "Database": {
                    "type": "string"
                }
            },
            "required": [
                "Cluster", "Azure AD Client ID", "Azure AD Client Secret",
                "Azure AD Tenant Id", "Database"
            ],
            "order": [
                'Cluster', 'Azure AD Client ID', 'Azure AD Client Secret',
                'Azure AD Tenant Id', 'Database'
            ],
            "secret": ["Azure AD Client Secret"]
        }

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def annotate_query(cls):
        return False

    @classmethod
    def type(cls):
        return "azure_kusto"

    @classmethod
    def name(cls):
        return "Azure Data Explorer (Kusto)"

    def run_query(self, query, user):

        kcsb = KustoConnectionStringBuilder.with_aad_application_key_authentication(
            connection_string=self.configuration['Cluster'],
            aad_app_id=self.configuration['Azure AD Client ID'],
            app_key=self.configuration['Azure AD Client Secret'],
            authority_id=self.configuration['Azure AD Tenant Id'])

        client = KustoClient(kcsb)

        db = self.configuration['Database']
        try:
            response = client.execute(db, query)

            result_cols = response.primary_results[0].columns
            result_rows = response.primary_results[0].rows

            columns = []
            rows = []
            for c in result_cols:
                columns.append({
                    'name': c.column_name,
                    'friendly_name': c.column_name,
                    'type': TYPES_MAP.get(c.column_type, None)
                })

            # rows must be [{'column1': value, 'column2': value}]
            for row in result_rows:
                rows.append(row.to_dict())

            error = None
            data = {'columns': columns, 'rows': rows}
            json_data = json_dumps(data)

        except KustoServiceError as err:
            json_data = None
            try:
                error = err.args[1][0]['error']['@message']
            except (IndexError, KeyError):
                error = err.args[1]
        except KeyboardInterrupt:
            json_data = None
            error = "Query cancelled by user."

        return json_data, error

    def get_schema(self, get_stats=False):

        get_tables_list_query = ".show tables | project TableName"

        get_tables_list_results, error = self.run_query(get_tables_list_query, None)
        if error is not None:
            raise Exception("Failed getting schema.")
        tables_list_response = json_loads(get_tables_list_results)

        tables_list = []

        for table in tables_list_response['rows']:
            get_table_schema_query = ".show table %s schema as json | project Schema" % table['TableName']
            result, error = self.run_query(get_table_schema_query, None)
            table_schema = json_loads(result)
            if error is not None:
                raise Exception("Failed getting schema.")

            tables_list.append(json_loads(table_schema['rows'][0]['Schema']))

        schema = {}

        for table in tables_list:
            table_name = table['Name']

            if table_name not in schema:
                schema[table_name] = {'name': table_name, 'columns': []}
            for column in table['OrderedColumns']:
                schema[table_name]['columns'].append(column['Name'])

        return schema.values()


register(AzureKusto)
