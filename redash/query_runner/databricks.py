import base64
import * from hive_ds


class DataBricks(Hive):

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "host": {
                    "type": "string"
                },
                "port": {
                    "type": "number"
                },
                "database": {
                    "type": "string"
                },
                "username": {
                    "type": "string"
                },
                "use_http": {
                    "type": "boolean",
                    "title": "Use HTTP transport"
                },
                "http_scheme": {
                    "type": "string",
                    "title": "Scheme when using HTTP transport",
                    "default": "https"
                },
                "http_path": {
                    "type": "string",
                    "title": "Path when using HTTP transport"
                },
                "http_password": {
                    "type": "string",
                    "title": "Password when using HTTP transport"
                },
            },
            "required": ["host"]
        }

    @classmethod
    def type(cls):
        return "databricks"

    def __init__(self, configuration):
        super(DataBricks, self).__init__(configuration)

    def run_query(self, query, user):

        connection = None
        try:
            if self.configuration.get('use_http', False):
                # default to https
                scheme = self.configuration.get('http_scheme', 'https')

                # if path is set but is missing initial slash, append it
                path = self.configuration.get('http_path', '')
                if path and path[0] != '/':
                    path = '/' + path

                # if port is set prepend colon
                port = self.configuration.get('port', '')
                if port:
                    port = ':' + port

                # build uri
                http_uri = "{}://{}{}{}".format(scheme, host, port, path)

                # create transport
                transport = THttpClient.THttpClient(http_uri)

                # if username or password is set, add Authorization header
                username = self.configuration.get('username', '')
                password = self.configuration.get('http_password', '')
                if username || password:
                    auth = base64.b64encode(username + ':' + password)
                    transport.setCustomHeaders({'Authorization': 'Basic ' + auth})

                # create connection
                connection = hive.connect(thrift_transport=transport)
            else:
                connection = hive.connect(
                    host=self.configuration['host'],
                    port=self.configiration.get('port', None),
                    database=self.configuration.get('database', 'default'),
                    username=self.configuration.get('username', None),
                )

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
        except KeyboardInterrupt:
            connection.cancel()
            error = "Query cancelled by user."
            json_data = None
        finally:
            if connection:
                connection.close()

        return json_data, error

register(DataBricks)
