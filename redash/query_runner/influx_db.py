import logging

from redash.query_runner import (
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
    BaseQueryRunner,
    register,
)

logger = logging.getLogger(__name__)

try:
    from influxdb import InfluxDBClient

    enabled = True

except ImportError:
    enabled = False


TYPES_MAP = {
    str: TYPE_STRING,
    int: TYPE_INTEGER,
    float: TYPE_FLOAT,
}


def _get_type(value):
    return TYPES_MAP.get(type(value), TYPE_STRING)


def _transform_result(results):
    column_names = []
    column_types = {}
    result_rows = []

    for result in results:
        for series in result.raw.get("series", []):
            for column in series["columns"]:
                if column not in column_names:
                    column_names.append(column)
            tags = series.get("tags", {})
            for key in tags.keys():
                if key not in column_names:
                    column_names.append(key)

    for result in results:
        for series in result.raw.get("series", []):
            for point in series["values"]:
                result_row = {}
                for column in column_names:
                    tags = series.get("tags", {})
                    if column in tags:
                        result_row[column] = tags[column]
                    elif column in series["columns"]:
                        index = series["columns"].index(column)
                        value = point[index]
                        result_row[column] = value
                    else:
                        continue
                    if column not in column_types and result_row[column] is not None:
                        column_types[column] = _get_type(result_row[column])
                result_rows.append(result_row)

    result_columns = [{"name": c, "type": column_types.get(c, TYPE_STRING)} for c in column_names]

    return {"columns": result_columns, "rows": result_rows}


class InfluxDB(BaseQueryRunner):
    should_annotate_query = False
    noop_query = "show measurements limit 1"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {"url": {"type": "string"}},
            "required": ["url"],
        }

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def type(cls):
        return "influxdb"

    def run_query(self, query, user):
        client = InfluxDBClient.from_dsn(self.configuration["url"])

        logger.debug("influxdb url: %s", self.configuration["url"])
        logger.debug("influxdb got query: %s", query)

        try:
            results = client.query(query)
            if not isinstance(results, list):
                results = [results]

            json_data = _transform_result(results)
            error = None
        except Exception as ex:
            json_data = None
            error = str(ex)

        return json_data, error


register(InfluxDB)
