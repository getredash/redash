import requests
from redash.query_runner import BaseQueryRunner, register


class Url(BaseQueryRunner):
    default_doc_url = ("http://redash.readthedocs.io/en/latest/"
                       "datasources.html#url")

    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'url': {
                    'type': 'string',
                    'title': 'URL base path'
                },
                "doc_url": {
                    "type": "string",
                    "title": "Documentation URL",
                    "default": cls.default_doc_url
                },
                "toggle_table_string": {
                    "type": "string",
                    "title": "Toggle Table String",
                    "default": "_v",
                    "info": "This string will be used to toggle visibility of tables in the schema browser when editing a query in order to remove non-useful tables from sight."
                }
            }
        }

    @classmethod
    def annotate_query(cls):
        return False

    def test_connection(self):
        pass

    def run_query(self, query, user):
        base_url = self.configuration.get("url", None)

        try:
            error = None
            query = query.strip()

            if base_url is not None and base_url != "":
                if query.find("://") > -1:
                    return None, "Accepting only relative URLs to '%s'" % base_url

            if base_url is None:
                base_url = ""

            url = base_url + query

            response = requests.get(url)
            response.raise_for_status()
            response.update({'data_scanned':'N/A'})
            json_data = response.content.strip()

            if not json_data:
                error = "Got empty response from '{}'.".format(url)

            return json_data, error
        except requests.RequestException as e:
            return None, str(e)
        except KeyboardInterrupt:
            error = "Query cancelled by user."
            json_data = None

        return json_data, error

register(Url)
