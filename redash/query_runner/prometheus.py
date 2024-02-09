import os
import time
from base64 import b64decode
from datetime import datetime
from tempfile import NamedTemporaryFile
from urllib.parse import parse_qs

import requests
from dateutil import parser

from redash.query_runner import (
    TYPE_DATETIME,
    TYPE_STRING,
    BaseQueryRunner,
    register,
)


def get_instant_rows(metrics_data):
    rows = []

    for metric in metrics_data:
        row_data = metric["metric"]

        timestamp, value = metric["value"]
        date_time = datetime.fromtimestamp(timestamp)

        row_data.update({"timestamp": date_time, "value": value})
        rows.append(row_data)
    return rows


def get_range_rows(metrics_data):
    rows = []

    for metric in metrics_data:
        ts_values = metric["values"]
        metric_labels = metric["metric"]

        for values in ts_values:
            row_data = metric_labels.copy()

            timestamp, value = values
            date_time = datetime.fromtimestamp(timestamp)

            row_data.update({"timestamp": date_time, "value": value})
            rows.append(row_data)
    return rows


# Convert datetime string to timestamp
def convert_query_range(payload):
    query_range = {}

    for key in ["start", "end"]:
        if key not in payload.keys():
            continue
        value = payload[key][0]

        if isinstance(value, str):
            # Don't convert timestamp string
            try:
                int(value)
                continue
            except ValueError:
                pass
            value = parser.parse(value)

        if type(value) is datetime:
            query_range[key] = [int(time.mktime(value.timetuple()))]

    payload.update(query_range)


class Prometheus(BaseQueryRunner):
    should_annotate_query = False

    def _get_datetime_now(self):
        return datetime.now()

    def _get_prometheus_kwargs(self):
        ca_cert_file = self._create_cert_file("ca_cert_File")
        if ca_cert_file is not None:
            verify = ca_cert_file
        else:
            verify = self.configuration.get("verify_ssl", True)

        cert_file = self._create_cert_file("cert_File")
        cert_key_file = self._create_cert_file("cert_key_File")
        if cert_file is not None and cert_key_file is not None:
            cert = (cert_file, cert_key_file)
        else:
            cert = ()

        return {
            "verify": verify,
            "cert": cert,
        }

    def _create_cert_file(self, key):
        cert_file_name = None

        if self.configuration.get(key, None) is not None:
            with NamedTemporaryFile(mode="w", delete=False) as cert_file:
                cert_bytes = b64decode(self.configuration[key])
                cert_file.write(cert_bytes.decode("utf-8"))
                cert_file_name = cert_file.name

        return cert_file_name

    def _cleanup_cert_files(self, promehteus_kwargs):
        verify = promehteus_kwargs.get("verify", True)
        if isinstance(verify, str) and os.path.exists(verify):
            os.remove(verify)

        cert = promehteus_kwargs.get("cert", ())
        for cert_file in cert:
            if os.path.exists(cert_file):
                os.remove(cert_file)

    @classmethod
    def configuration_schema(cls):
        # files has to end with "File" in name
        return {
            "type": "object",
            "properties": {
                "url": {"type": "string", "title": "Prometheus API URL"},
                "verify_ssl": {
                    "type": "boolean",
                    "title": "Verify SSL (Ignored, if SSL Root Certificate is given)",
                    "default": True,
                },
                "cert_File": {"type": "string", "title": "SSL Client Certificate", "default": None},
                "cert_key_File": {"type": "string", "title": "SSL Client Key", "default": None},
                "ca_cert_File": {"type": "string", "title": "SSL Root Certificate", "default": None},
            },
            "required": ["url"],
            "secret": ["cert_File", "cert_key_File", "ca_cert_File"],
            "extra_options": ["verify_ssl", "cert_File", "cert_key_File", "ca_cert_File"],
        }

    def test_connection(self):
        result = False
        promehteus_kwargs = {}
        try:
            promehteus_kwargs = self._get_prometheus_kwargs()
            resp = requests.get(self.configuration.get("url", None), **promehteus_kwargs)
            result = resp.ok
        except Exception:
            raise
        finally:
            self._cleanup_cert_files(promehteus_kwargs)

        return result

    def get_schema(self, get_stats=False):
        schema = []
        promehteus_kwargs = {}
        try:
            base_url = self.configuration["url"]
            metrics_path = "/api/v1/label/__name__/values"
            promehteus_kwargs = self._get_prometheus_kwargs()

            response = requests.get(base_url + metrics_path, **promehteus_kwargs)

            response.raise_for_status()
            data = response.json()["data"]

            schema = {}
            for name in data:
                schema[name] = {"name": name, "columns": []}
            schema = list(schema.values())
        except Exception:
            raise
        finally:
            self._cleanup_cert_files(promehteus_kwargs)

        return schema

    def run_query(self, query, user):
        """
        Query Syntax, actually it is the URL query string.
        Check the Prometheus HTTP API for the details of the supported query string.

        https://prometheus.io/docs/prometheus/latest/querying/api/

        example: instant query
            query=http_requests_total

        example: range query
            query=http_requests_total&start=2018-01-20T00:00:00.000Z&end=2018-01-25T00:00:00.000Z&step=60s

        example: until now range query
            query=http_requests_total&start=2018-01-20T00:00:00.000Z&step=60s
            query=http_requests_total&start=2018-01-20T00:00:00.000Z&end=now&step=60s
        """

        base_url = self.configuration["url"]
        columns = [
            {"friendly_name": "timestamp", "type": TYPE_DATETIME, "name": "timestamp"},
            {"friendly_name": "value", "type": TYPE_STRING, "name": "value"},
        ]
        promehteus_kwargs = {}

        try:
            error = None
            query = query.strip()
            # for backward compatibility
            query = "query={}".format(query) if not query.startswith("query=") else query

            payload = parse_qs(query)
            query_type = "query_range" if "step" in payload.keys() else "query"

            # for the range of until now
            if query_type == "query_range" and ("end" not in payload.keys() or "now" in payload["end"]):
                date_now = self._get_datetime_now()
                payload.update({"end": [date_now]})

            convert_query_range(payload)

            api_endpoint = base_url + "/api/v1/{}".format(query_type)

            promehteus_kwargs = self._get_prometheus_kwargs()

            response = requests.get(api_endpoint, params=payload, **promehteus_kwargs)
            response.raise_for_status()

            metrics = response.json()["data"]["result"]

            if len(metrics) == 0:
                return None, "query result is empty."

            metric_labels = metrics[0]["metric"].keys()

            for label_name in metric_labels:
                columns.append(
                    {
                        "friendly_name": label_name,
                        "type": TYPE_STRING,
                        "name": label_name,
                    }
                )

            if query_type == "query_range":
                rows = get_range_rows(metrics)
            else:
                rows = get_instant_rows(metrics)

            data = {"rows": rows, "columns": columns}

        except requests.RequestException as e:
            return None, str(e)
        except Exception:
            raise
        finally:
            self._cleanup_cert_files(promehteus_kwargs)

        return data, error


register(Prometheus)
