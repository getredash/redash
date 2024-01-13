import logging
import os
from base64 import b64decode
from tempfile import NamedTemporaryFile
from typing import Any, Dict, Optional, Tuple, Type, TypeVar

from redash.query_runner import (
    TYPE_BOOLEAN,
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
    BaseQueryRunner,
    register,
)

try:
    from influxdb_client import InfluxDBClient

    enabled = True
except ImportError:
    enabled = False

logger = logging.getLogger(__name__)

T = TypeVar("T")

TYPES_MAP = {
    "integer": TYPE_INTEGER,
    "long": TYPE_INTEGER,
    "float": TYPE_FLOAT,
    "double": TYPE_FLOAT,
    "boolean": TYPE_BOOLEAN,
    "string": TYPE_STRING,
    "datetime:RFC3339": TYPE_DATETIME,
}


class InfluxDBv2(BaseQueryRunner):
    """
    Query runner for influxdb version 2.
    """

    should_annotate_query = False

    def _get_influx_kwargs(self) -> Dict:
        """
        Determines additional arguments for influxdb client connection.
        :return: An object with additional arguments for influxdb client.
        """
        return {
            "verify_ssl": self.configuration.get("verify_ssl", None),
            "cert_file": self._create_cert_file("cert_File"),
            "cert_key_file": self._create_cert_file("cert_key_File"),
            "cert_key_password": self.configuration.get("cert_key_password", None),
            "ssl_ca_cert": self._create_cert_file("ssl_ca_cert_File"),
        }

    def _create_cert_file(self, key: str) -> str:
        """
        Creates a temporary file from base64 encoded content from stored
        configuration in filesystem.
        :param key: The key to get the content from configuration object.
        :return: The name of temporary file.
        """
        cert_file_name = None

        if self.configuration.get(key, None) is not None:
            with NamedTemporaryFile(mode="w", delete=False) as cert_file:
                cert_bytes = b64decode(self.configuration[key])
                cert_file.write(cert_bytes.decode("utf-8"))
                cert_file_name = cert_file.name

        return cert_file_name

    def _cleanup_cert_files(self, influx_kwargs: Dict) -> None:
        """
        Deletes temporary stored files in filesystem.
        """
        for key in ["cert_file", "cert_key_file", "ssl_ca_cert"]:
            cert_path = influx_kwargs.get(key, None)
            if cert_path is not None and os.path.exists(cert_path):
                os.remove(cert_path)

    @classmethod
    def configuration_schema(cls: Type[T]) -> Dict:
        """
        Defines a configuration schema for this query runner.
        :param cls: Object of this class.
        :return: The defined configuration schema.
        """
        # files has to end with "File" in name
        return {
            "type": "object",
            "properties": {
                "url": {"type": "string", "title": "URL"},
                "org": {"type": "string", "title": "Organization"},
                "token": {"type": "string", "title": "Token"},
                "verify_ssl": {"type": "boolean", "title": "Verify SSL", "default": False},
                "cert_File": {"type": "string", "title": "SSL Client Certificate", "default": None},
                "cert_key_File": {"type": "string", "title": "SSL Client Key", "default": None},
                "cert_key_password": {"type": "string", "title": "Password for SSL Client Key", "default": None},
                "ssl_ca_cert_File": {"type": "string", "title": "SSL Root Certificate", "default": None},
            },
            "order": ["url", "org", "token", "cert_File", "cert_key_File", "cert_key_password", "ssl_ca_cert_File"],
            "required": ["url", "org", "token"],
            "secret": ["token", "cert_File", "cert_key_File", "cert_key_password", "ssl_ca_cert_File"],
            "extra_options": ["verify_ssl", "cert_File", "cert_key_File", "cert_key_password", "ssl_ca_cert_File"],
        }

    @classmethod
    def enabled(cls: Type[T]) -> bool:
        """
        Determines, if this query runner is enabled or not.
        :param cls: Object of this class.
        :return: True, if this query runner is enabled; otherwise False.
        """
        return enabled

    def test_connection(self) -> None:
        """
        Tests the healthiness of the influxdb instance. If it is not healthy,
        it logs an error message and raises an exception with an appropriate
        message.
        :raises Exception: If the remote influxdb instance is not healthy.
        """
        try:
            influx_kwargs = self._get_influx_kwargs()
            with InfluxDBClient(
                url=self.configuration["url"],
                token=self.configuration["token"],
                org=self.configuration["org"],
                **influx_kwargs,
            ) as client:
                healthy = client.health()
                if healthy.status == "fail":
                    logger.error("Connection test failed, due to: " f"{healthy.message!r}.")
                    raise Exception("InfluxDB is not healthy. Check logs for more " "information.")
        except Exception:
            raise
        finally:
            self._cleanup_cert_files(influx_kwargs)

    def _get_type(self, type_: str) -> str:
        """
        Determines the internal type of a passed data type which the database
        uses.
        :param type_: The type from the database to map to internal datatype.
        :return: The name of the internal datatype.
        """
        return TYPES_MAP.get(type_, "string")

    def _get_data_from_tables(self, tables: Any) -> Dict:
        """
        Determines the data of the given tables in an appropriate schema for
        redash ui to render it. It retrieves all available columns and records
        from the tables.
        :param tables: A list of FluxTable instances.
        :return: An object with columns and rows list.
        """
        columns = []
        rows = []

        for table in tables:
            for column in table.columns:
                column_entry = {
                    "name": column.label,
                    "type": self._get_type(column.data_type),
                    "friendly_name": column.label.title(),
                }
                if column_entry not in columns:
                    columns.append(column_entry)

            rows.extend([row.values for row in [record for record in table.records]])

        return {"columns": columns, "rows": rows}

    def run_query(self, query: str, user: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Runs a given query against the influxdb instance and returns its
        result.
        :param query: The query, this runner is executed.
        :param user: The user who runs the query.
        :return: A 2-tuple:
            1. element: The queried result in an appropriate format for redash
                ui. If an error occurred, it returns None.
            2. element: An error message, if an error occured. None, if no
                error occurred.
        """
        data = None
        error = None

        try:
            influx_kwargs = self._get_influx_kwargs()
            with InfluxDBClient(
                url=self.configuration["url"],
                token=self.configuration["token"],
                org=self.configuration["org"],
                **influx_kwargs,
            ) as client:
                logger.debug(f"InfluxDB got query: {query!r}")

                tables = client.query_api().query(query)

                data = self._get_data_from_tables(tables)
        except Exception as ex:
            error = str(ex)
        finally:
            self._cleanup_cert_files(influx_kwargs)

        return data, error


register(InfluxDBv2)
