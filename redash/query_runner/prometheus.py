import time
import requests
from urlparse import parse_qs
from datetime import datetime
from dateutil.tz import UTC
from dateutil.parser import parse
from dateutil.relativedelta import relativedelta
from redash.query_runner import BaseQueryRunner, register, TYPE_DATETIME, TYPE_STRING
from redash.utils import json_dumps, json_loads


def get_instant_rows(metrics_data):
    rows = []

    for metric in metrics_data:
        row_data = metric['metric']

        timestamp, value = metric['value']
        date_time = datetime.fromtimestamp(timestamp)
        row_data.update({"timestamp": date_time, "value": float(value)})
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

            row_data.update({'timestamp': date_time, 'value': float(value)})
            rows.append(row_data)
    return rows


_EPOCH = datetime(1970, 1, 1, tzinfo=UTC)


def _timestamp(dt):
    # python2 compatibility, use dt.timestamp() in python3
    if dt.tzinfo is None:
        return time.mktime(dt.timetuple()) + dt.microsecond / 1e6
    else:
        return (dt - _EPOCH).total_seconds()


def _round_datetime(dt, unit, up=True):
    # One week from Sunday to Saturday
    if unit == 'week':
        if up:
            dt = dt + relativedelta(days=7 - (dt.isoweekday() % 7))
            up = False
        else:
            dt = dt + relativedelta(days=-(dt.isoweekday() % 7))
        unit = 'day'

    units = ('year', 'month', 'day', 'hour', 'minute', 'second')
    found = False
    dt_replace = {
        'microsecond': 0
    }

    for _unit in units:
        if found:
            if _unit in ('month', 'day'):
                dt_replace[_unit] = 1
            else:
                dt_replace[_unit] = 0

        if _unit == unit:
            if up:
                dt = dt + relativedelta(**{_unit + 's': 1})
            found = True

    return dt.replace(**dt_replace)


def parse_date_math(dt, math_str, round_up=True):
    # Algorithm is from grafana https://github.com/grafana/grafana/blob/master/public/app/core/utils/datemath.ts
    units = {
        'y': 'year',
        'M': 'month',
        'w': 'week',
        'd': 'day',
        'h': 'hour',
        'm': 'minute',
        's': 'second'
    }
    i = 0
    c_types = ('/', '+', '-')

    while i < len(math_str) - 1:
        c = math_str[i]
        i += 1

        if c not in c_types:
            dt = None
            break

        if not math_str[i].isdigit():
            num = 1
        elif len(math_str) == 2:
            num = math_str[i]
        else:
            num_from = i
            while math_str[i].isdigit():
                i += 1
                if i > 10:
                    dt = None
                    break
            num = int(math_str[num_from:i], 10)

        if c == '/' and num != 1:
            # rounding is only allowed on whole, single, units (eg M or 1M, not 0.5M or 2M)
            dt = None
            break

        unit = math_str[i]
        i += 1

        if unit not in units:
            dt = None
            break
        else:
            unit_name = units[unit]
            if c == '/':
                dt = _round_datetime(dt, unit_name, round_up)
            elif c == '+':
                dt = dt + relativedelta(**{
                    unit_name + 's': num
                })
            elif c == '-':
                dt = dt - relativedelta(**{
                    unit_name + 's': num
                })

    return dt


def convert_to_timestamp(value, round_up=True):
    # Convert datetime string to timestamp
    if value is None:
        return None

    if type(value) is str:
        # Don't convert timestamp string
        if value.isdigit():
            return value

        if value.startswith('now'):
            dt_value = parse_date_math(datetime.now(), value[3:], round_up)

            if dt_value is None:
                raise Exception('Can not parse "{}"'.format(value))

            value = dt_value
        else:
            value = parse(value)

    if type(value) is datetime:
        return int(_timestamp(value))

    return value


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
            schema[name] = {'name': name, 'columns': []}
        return schema.values()

    def run_query(self, query, user):
        """
        Query Syntax, actually it is a JSON query which is converted from the URL query string.
        Check the Prometheus HTTP API for the details of the supported query string.

        https://prometheus.io/docs/prometheus/latest/querying/api/

        timestamp parameters type support:
            rfc3339:                '2018-01-20T00:00:00.000Z'
            unix timestamp:         '1516406400'
            time units of grafana:  'now', 'now-1h', 'now/h'
            redash frontend:        '2018-01-20 00:00:00'

        timestamp parameters include 'time', 'start' and 'end'.
        about the time units of grafana http://docs.grafana.org/reference/timerange/

        query example: instant query
            {
                "query": "http_requests_total",
                "time": "now"  # optional
            }

        query example: range query
            {
                "query": "http_requests_total",
                "step": "60s",
                "start": "now-1h",  # optional
                "end": "now"  # optional
            }
        """

        base_url = self.configuration["url"]
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

        try:
            error = None
            try:
                payload = json_loads(query)
            except Exception:
                # for backward compatibility
                query = query.strip()
                query = 'query={}'.format(query) if not query.startswith('query=') else query
                payload = parse_qs(query)
                for k in payload:
                    payload[k] = payload[k][0]

            query_type = 'query_range' if 'step' in payload else 'query'

            if query_type == 'query_range':
                # for the range of until now
                if 'end' not in payload:
                    range_end = 'now'
                else:
                    range_end = payload['end']

                payload['end'] = convert_to_timestamp(range_end)

                if 'start' in payload:
                    payload['start'] = convert_to_timestamp(payload['start'], False)

            elif query_type == 'query':
                if 'time' in payload:
                    payload['time'] = convert_to_timestamp(payload['time'])

            api_endpoint = base_url + '/api/v1/{}'.format(query_type)

            response = requests.get(api_endpoint, params=payload)
            response.raise_for_status()

            metrics = response.json()['data']['result']

            if len(metrics) == 0:
                return None, 'Query result is empty.'

            metric_labels = metrics[0]['metric'].keys()

            for label_name in metric_labels:
                columns.append({
                    'friendly_name': label_name,
                    'type': TYPE_STRING,
                    'name': label_name
                })

            if query_type == 'query_range':
                rows = get_range_rows(metrics)
            else:
                rows = get_instant_rows(metrics)

            json_data = json_dumps(
                {
                    'rows': rows,
                    'columns': columns
                }
            )

        except requests.RequestException as e:
            return None, str(e)
        except KeyboardInterrupt:
            error = "Query cancelled by user."
            json_data = None

        return json_data, error


register(Prometheus)
