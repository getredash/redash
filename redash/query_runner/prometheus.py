import requests
from datetime import datetime
from urlparse import parse_qs
from redash.query_runner import BaseQueryRunner, register, TYPE_DATETIME, TYPE_STRING
from redash.utils import json_dumps


def get_instant_rows(metrics_data):
    rows = []

    for metric in metrics_data:
        row_data = metric['metric']

        timestamp, value = metric['value']
        date_time = datetime.fromtimestamp(timestamp)

        row_data.update({"timestamp": date_time, "value": value})
        rows.append(row_data)
    return rows


def get_range_rows(metrics_data):
    rows = []

    for metric in metrics_data:
        ts_values = metric['values']
        metric_labels = metric['metric']

        for values in ts_values:
            row_data = metric_labels.copy()

            timestamp, value = values
            date_time = datetime.fromtimestamp(timestamp)

            row_data.update({'timestamp': date_time, 'value': value})
            rows.append(row_data)
    return rows


class Prometheus(BaseQueryRunner):
    def __init__(self, configuration):
        self.columns = [
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

        super(Prometheus, self).__init__(configuration)

    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'url': {
                    'type': 'string',
                    'title': 'Prometheus API URL'
                }
            },
            "required": ["url"]
        }

    @classmethod
    def annotate_query(cls):
        return False

    def test_connection(self):
        resp = requests.get(self.configuration.get("url", None))
        return resp.ok

    def get_schema(self, get_stats=False):
        base_url = self.configuration["url"]
        metrics_path = '/api/v1/label/__name__/values'
        response = requests.get(base_url + metrics_path)
        response.raise_for_status()
        data = response.json()['data']

        schema = {}
        for name in data:
            schema[name] = {'name': name}

        return schema.values()

    def run_query(self, query, user):
        """
        query syntax, it is the actual url query string.
        check the prometheus http API for the detail of supported query string.

        https://prometheus.io/docs/prometheus/latest/querying/api/

        example: instant query
            query=http_requests_total

        example: range query
            query=http_requests_total&start=2018-01-20T00:00:00.000Z&end=2018-01-25T00:00:00.000Z&step=60s
        """

        base_url = self.configuration["url"]

        try:
            error = None
            query = query.strip()
            # for backward compatibility
            query = 'query={}'.format(query) if not query.startswith('query=') else query

            payload = parse_qs(query)
            query_type = 'query_range' if 'step' in payload.keys() else 'query'
            api_endpoint = base_url + '/api/v1/{}'.format(query_type)

            response = requests.get(api_endpoint, params=payload)
            response.raise_for_status()

            metrics = response.json()['data']['result']

            if len(metrics) == 0:
                return None, 'query result is empty.'

            metric_labels = metrics[0]['metric'].keys()

            for label_name in metric_labels:
                self.columns.append({
                    'friendly_name': label_name,
                    'type': TYPE_STRING,
                    'name': label_name
                })

            rows = get_range_rows(metrics) if query_type == 'query_range' else get_instant_rows(metrics)
            json_data = json_dumps(
                {
                    'rows': rows,
                    'columns': self.columns
                }
            )

        except requests.RequestException as e:
            return None, str(e)
        except KeyboardInterrupt:
            error = "Query cancelled by user."
            json_data = None

        return json_data, error


register(Prometheus)
