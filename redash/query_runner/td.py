import sys
import json
import logging

from redash.query_runner import *
from redash.utils import JSONEncoder

logger = logging.getLogger(__name__)

types_map = {
    'str': TYPE_STRING,
    'int': TYPE_INTEGER,
    'Decimal': TYPE_FLOAT,
    'date': TYPE_DATE,
    'datetime': TYPE_DATETIME,
    'float': TYPE_FLOAT
}

class CustomJSONEncoder(JSONEncoder):
    """Custom JSON encoding class, to handle PyTD's Decimal NaNs and Infinites."""

    def default(self, o):
        import decimal

        if isinstance(o, decimal.Decimal):
            if o.is_finite():
                return float(o)
            else:
                return "null"

        super(CustomJSONEncoder, self).default(o)

class Teradata(BaseQueryRunner):
    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'host': {
                    'type': 'string',
                    'default': '127.0.0.1'
                },
                'user': {
                    'type': 'string'
                },
                'passwd': {
                    'type': 'string',
                    'title': 'Password'
                }
            },
            'required': ['host','user','passwd'],
            'secret': ['passwd']
        }

    @classmethod
    def name(cls):
        return "Teradata"

    @classmethod
    def enabled(cls):
        try:
            import teradata
        except ImportError:
            return False

        return True

    def run_query(self, query):
        import teradata
        connection = None
        try:
            udaExec = teradata.UdaExec(appName="redash", version="1.0",logConsole=False)
            connection = udaExec.connect(method="odbc", 
                                            system=self.configuration.get('host', ''),
                                            username=self.configuration.get('user', ''),
                                            password=self.configuration.get('passwd', ''),
                                            charset="UTF16")
            
            cursor = connection.cursor()

            logger.debug("Teradata running query: %s", query)
            cursor.execute(query)

            data = cursor.fetchall()

            # TODO - very similar to pg.py
            if cursor.description is not None:
                columns = self.fetch_columns([(i[0], types_map.get(i[1].__name__, None)) for i in cursor.description])
                rows = [dict(zip((c['name'] for c in columns), row)) for row in data]

                data = {'columns': columns, 'rows': rows}
                json_data = json.dumps(data, cls=CustomJSONEncoder)
                error = None
            else:
                json_data = None
                error = "No data was returned."

            cursor.close()
        except teradata.api.Error, e:
            json_data = None
            error = e.args[1]
        except KeyboardInterrupt:
            error = "Query cancelled by user."
            json_data = None
        except Exception as e:
            raise sys.exc_info()[1], None, sys.exc_info()[2]
        finally:
            if connection:
                connection.close()

        return json_data, error

register(Teradata)
