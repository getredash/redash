import csv
import io
from typing import Optional

import pyarrow
import pyarrow.compute
import pyarrow.parquet
import xlsxwriter
from dateutil.parser import isoparse as parse_date
from funcy import project, rpartial

from redash.authentication.org_resolving import current_org
from redash.query_runner import (
    TYPE_BOOLEAN,
    TYPE_DATE,
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
)
from redash.utils import UnicodeWriter, json_loads


def _convert_format(fmt):
    return (
        fmt.replace("DD", "%d")
        .replace("MM", "%m")
        .replace("YYYY", "%Y")
        .replace("YY", "%y")
        .replace("HH", "%H")
        .replace("mm", "%M")
        .replace("ss", "%S")
        .replace("SSS", "%f")
    )


def _convert_bool(value):
    if value is True:
        return "true"
    elif value is False:
        return "false"

    return value


def _convert_datetime(value, fmt):
    if not value:
        return value

    try:
        parsed = parse_date(value)
        ret = parsed.strftime(fmt)
    except Exception:
        return value

    return ret


def _get_column_lists(columns):
    date_format = _convert_format(current_org.get_setting("date_format"))
    datetime_format = _convert_format(
        "{} {}".format(
            current_org.get_setting("date_format"),
            current_org.get_setting("time_format"),
        )
    )

    special_types = {
        TYPE_BOOLEAN: _convert_bool,
        TYPE_DATE: rpartial(_convert_datetime, date_format),
        TYPE_DATETIME: rpartial(_convert_datetime, datetime_format),
    }

    fieldnames = []
    special_columns = dict()

    for col in columns:
        fieldnames.append(col["name"])

        for col_type in special_types.keys():
            if col["type"] == col_type:
                special_columns[col["name"]] = special_types[col_type]

    return fieldnames, special_columns


def serialize_query_result(query_result, is_api_user):
    if is_api_user:
        publicly_needed_keys = ["data", "retrieved_at"]
        return project(query_result.to_dict(), publicly_needed_keys)
    else:
        return query_result.to_dict()


def serialize_query_result_to_dsv(query_result, delimiter):
    s = io.StringIO()

    query_data = query_result.data

    fieldnames, special_columns = _get_column_lists(query_data["columns"] or [])

    writer = csv.DictWriter(
        s, extrasaction="ignore", fieldnames=fieldnames, delimiter=delimiter
    )
    writer.writeheader()

    for row in query_data["rows"]:
        for col_name, converter in special_columns.items():
            if col_name in row:
                row[col_name] = converter(row[col_name])

        writer.writerow(row)

    return s.getvalue()


def serialize_query_result_to_xlsx(query_result):
    output = io.BytesIO()

    query_data = query_result.data
    book = xlsxwriter.Workbook(output, {"constant_memory": True})
    sheet = book.add_worksheet("result")

    column_names = []
    for c, col in enumerate(query_data["columns"]):
        sheet.write(0, c, col["name"])
        column_names.append(col["name"])

    for r, row in enumerate(query_data["rows"]):
        for c, name in enumerate(column_names):
            v = row.get(name)
            if isinstance(v, (dict, list)):
                v = str(v)
            sheet.write(r + 1, c, v)

    book.close()

    return output.getvalue()


def serialize_query_result_to_parquet(query_result):
    output = io.BytesIO()
    query_data = query_result.data

    def redash_datetime_to_pyarrow_timestamp(
        table: "pyarrow.Table",
        field: "pyarrow.Field",
        conversion: Optional[dict] = None,
    ) -> "pyarrow.Table":
        column_index: int = table.schema.get_field_index(field.name)
        column_data = pyarrow.compute.strptime(
            table.column(column_index),
            format=conversion["redash_format"],
            unit="s",
        )
        new_table = table.set_column(column_index, field.name, column_data)
        return new_table

    conversions = [
        {"pyarrow_type": pyarrow.bool_(), "redash_type": TYPE_BOOLEAN},
        {
            "pyarrow_type": pyarrow.date32(),
            "redash_type": TYPE_DATE,
            "redash_format": r"%Y-%m-%d",
            "redash_to_pyarrow": redash_datetime_to_pyarrow_timestamp,
        },
        {
            "pyarrow_type": pyarrow.timestamp("s"),
            "redash_type": TYPE_DATETIME,
            "redash_format": r"%Y-%m-%d %H:%M:%S",
            "redash_to_pyarrow": redash_datetime_to_pyarrow_timestamp,
        },
        {"pyarrow_type": pyarrow.float64(), "redash_type": TYPE_FLOAT},
        {"pyarrow_type": pyarrow.int64(), "redash_type": TYPE_INTEGER},
        {"pyarrow_type": pyarrow.string(), "redash_type": TYPE_STRING},
    ]

    table = pyarrow.Table.from_pylist(query_data["rows"])
    fields = []

    for column in query_data["columns"]:
        for conversion in conversions:
            if column["type"] == conversion["redash_type"]:
                field = pyarrow.field(
                    name=column["name"],
                    type=conversion["pyarrow_type"],
                    metadata={"friendly_name": column["friendly_name"]},
                )
                fields.append(field)
                converter = conversion.get("redash_to_pyarrow")
                if converter:
                    table = converter(
                        table=table,
                        field=field,
                        conversion=conversion,
                    )
                break
    target_schema = pyarrow.schema(fields)
    table = table.cast(target_schema=target_schema)
    with pyarrow.parquet.ParquetWriter(
        where=output,
        schema=target_schema,
    ) as writer:
        writer.write_table(table)

    return output.getvalue()
