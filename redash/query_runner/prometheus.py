import requests
import datetime
from redash.query_runner import BaseQueryRunner, register, TYPE_DATETIME, TYPE_STRING
from redash.utils import json_dumps


class Prometheus(BaseQueryRunner):
    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'url': {
                    'type': 'string',
                    'title': 'Prometheus API URL'
                }
            }
        }

    @classmethod
    def annotate_query(cls):
        return False

    def test_connection(self):
        resp = requests.get(self.configuration.get("url", None))
        return resp.ok

    def get_schema(self, get_stats=False):
        metrics_names = '/api/v1/label/__name__/values'
        results, error = self.run_query(metrics_names, None)

        schema = {}
        for name in results:
            schema[name] = {'name': name}

        return schema.values()

    def run_query(self, query, user):
        base_url = self.configuration.get("url", None)

        try:
            error = None
            query = query.strip()

            local_query = 'api/v1/query'
            if '__name__/values' in query:
                url = base_url + query
                response = requests.get(url)
                response.raise_for_status()
                json_data = response.json()['data']
            else:
                url = base_url + local_query
                payload = {'query': query}
                response = requests.get(url, params=payload)
                response.raise_for_status()
                raw_data = response.json()['data']['result']
                columns = [
                    {
                        'friendly_name': 'timestamp',
                        'type': TYPE_DATETIME,
                        'name': 'timestamp'
                    },
                    {
                        'friendly_name': 'value',
                        'type': TYPE_STRING,
                        'name': 'value'
                    },
                ]
                columns_name = raw_data[0]['metric'].keys()
                for column_name in columns_name:
                    columns.append({
                        'friendly_name': column_name,
                        'type': TYPE_STRING,
                        'name': column_name
                    })
                rows = []
                for row in raw_data:
                    h = {}
                    for r in row['metric']:
                        h[r] = row['metric'][r]
                        h['value'] = row['value'][1]
                        h['timestamp'] = datetime.datetime.fromtimestamp(row['value'][0])
                    rows.append(h)

                json_data = json_dumps(
                    {
                        'rows': rows,
                        'columns': columns
                    }
                )

            return json_data, error
        except requests.RequestException as e:
            return None, str(e)
        except KeyboardInterrupt:
            error = "Query cancelled by user."
            json_data = None

        return json_data, error


register(Prometheus)
