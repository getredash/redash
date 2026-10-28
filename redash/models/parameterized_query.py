import datetime
import re
from functools import partial
from numbers import Number

import pystache
from dateutil.parser import parse
from dateutil.relativedelta import relativedelta
from funcy import distinct

from redash.utils import mustache_render, utcnow

# Dynamic ("d_*") values offered by the frontend for date and date range
# parameters. The browser resolves them right before running a query, so they
# have to be resolved here as well for everything that doesn't go through the
# browser: scheduled refreshes, API calls and the query hash. The definitions
# mirror client/app/services/parameters/DateParameter.js and
# DateRangeParameter.js (with moment's default locale, weeks start on Sunday).
# They are evaluated in UTC.
DYNAMIC_PREFIX = "d_"

DATE_TYPES = ("date", "datetime-local", "datetime-with-seconds")
DATE_RANGE_TYPES = ("date-range", "datetime-range", "datetime-range-with-seconds")

DATETIME_FORMATS = {
    "date": "%Y-%m-%d",
    "datetime-local": "%Y-%m-%d %H:%M",
    "datetime-with-seconds": "%Y-%m-%d %H:%M:%S",
    "date-range": "%Y-%m-%d",
    "datetime-range": "%Y-%m-%d %H:%M",
    "datetime-range-with-seconds": "%Y-%m-%d %H:%M:%S",
}


def _start_of_day(dt):
    return dt.replace(hour=0, minute=0, second=0, microsecond=0)


def _end_of_day(dt):
    return dt.replace(hour=23, minute=59, second=59, microsecond=999999)


def _start_of_week(dt):
    return _start_of_day(dt - datetime.timedelta(days=(dt.weekday() + 1) % 7))


def _end_of_week(dt):
    return _end_of_day(_start_of_week(dt) + datetime.timedelta(days=6))


def _start_of_month(dt):
    return _start_of_day(dt.replace(day=1))


def _end_of_month(dt):
    return _end_of_day(_start_of_month(dt) + relativedelta(months=1, days=-1))


def _start_of_year(dt):
    return _start_of_day(dt.replace(month=1, day=1))


def _end_of_year(dt):
    return _end_of_day(dt.replace(month=12, day=31))


def _period(start_of, end_of, **ago):
    """The whole day/week/month/year that contains ``now - ago``."""

    def resolve(now):
        reference = now - relativedelta(**ago)
        return start_of(reference), end_of(reference)

    return resolve


def _until_now(start_of_day=True, **ago):
    """From ``now - ago`` (the beginning of that day unless told otherwise) until now."""

    def resolve(now):
        start = now - relativedelta(**ago)
        return (_start_of_day(start) if start_of_day else start), now

    return resolve


DYNAMIC_DATES = {
    "d_now": lambda now: now,
    "d_yesterday": lambda now: now - datetime.timedelta(days=1),
}

DYNAMIC_DATE_RANGES = {
    "d_today": _period(_start_of_day, _end_of_day),
    "d_yesterday": _period(_start_of_day, _end_of_day, days=1),
    "d_this_week": _period(_start_of_week, _end_of_week),
    "d_this_month": _period(_start_of_month, _end_of_month),
    "d_this_year": _period(_start_of_year, _end_of_year),
    "d_last_week": _period(_start_of_week, _end_of_week, weeks=1),
    "d_last_month": _period(_start_of_month, _end_of_month, months=1),
    "d_last_year": _period(_start_of_year, _end_of_year, years=1),
    "d_last_hour": _until_now(start_of_day=False, hours=1),
    "d_last_8_hours": _until_now(start_of_day=False, hours=8),
    "d_last_24_hours": _until_now(start_of_day=False, hours=24),
    "d_last_7_days": _until_now(days=7),
    "d_last_14_days": _until_now(days=14),
    "d_last_30_days": _until_now(days=30),
    "d_last_60_days": _until_now(days=60),
    "d_last_90_days": _until_now(days=90),
    "d_last_12_months": _until_now(months=12),
    "d_last_2_years": _until_now(years=2),
    "d_last_3_years": _until_now(years=3),
    "d_last_10_years": _until_now(years=10),
}


def resolve_dynamic_value(value, parameter_type, now=None):
    """Replace a dynamic date or date range value with the concrete value the
    frontend would send when running the query. Anything else is returned as is,
    so unknown dynamic values are still rejected by the regular validation."""
    if not isinstance(value, str) or not value.startswith(DYNAMIC_PREFIX):
        return value

    now = now or utcnow()
    date_format = DATETIME_FORMATS.get(parameter_type)

    if parameter_type in DATE_TYPES and value in DYNAMIC_DATES:
        return DYNAMIC_DATES[value](now).strftime(date_format)

    if parameter_type in DATE_RANGE_TYPES and value in DYNAMIC_DATE_RANGES:
        start, end = DYNAMIC_DATE_RANGES[value](now)
        return {"start": start.strftime(date_format), "end": end.strftime(date_format)}

    return value


def _pluck_name_and_value(default_column, row):
    row = {k.lower(): v for k, v in row.items()}
    name_column = "name" if "name" in row.keys() else default_column.lower()
    value_column = "value" if "value" in row.keys() else default_column.lower()

    return {"name": row[name_column], "value": str(row[value_column])}


def _load_result(query_id, org):
    from redash import models

    query = models.Query.get_by_id_and_org(query_id, org)

    if query.data_source:
        query_result = models.QueryResult.get_by_id_and_org(query.latest_query_data_id, org)
        return query_result.data
    else:
        raise QueryDetachedFromDataSourceError(query_id)


def dropdown_values(query_id, org):
    data = _load_result(query_id, org)
    first_column = data["columns"][0]["name"]
    pluck = partial(_pluck_name_and_value, first_column)
    return list(map(pluck, data["rows"]))


def join_parameter_list_values(parameters, schema):
    updated_parameters = {}
    for key, value in parameters.items():
        if isinstance(value, list):
            definition = next((definition for definition in schema if definition["name"] == key), {})
            multi_values_options = definition.get("multiValuesOptions", {})
            separator = str(multi_values_options.get("separator", ","))
            prefix = str(multi_values_options.get("prefix", ""))
            suffix = str(multi_values_options.get("suffix", ""))
            updated_parameters[key] = separator.join([prefix + v + suffix for v in value])
        else:
            updated_parameters[key] = value
    return updated_parameters


def _collect_key_names(nodes):
    keys = []
    for node in nodes._parse_tree:
        if isinstance(node, (pystache.parser._EscapeNode, pystache.parser._LiteralNode)):
            keys.append(node.key)
        elif isinstance(node, pystache.parser._SectionNode):
            keys.append(node.key)
            keys.extend(_collect_key_names(node.parsed))
        elif isinstance(node, pystache.parser._InvertedNode):
            keys.append(node.key)
            keys.extend(_collect_key_names(node.parsed_section))

    return distinct(keys)


def _collect_query_parameters(query):
    nodes = pystache.parse(query)
    keys = _collect_key_names(nodes)
    return keys


def _parameter_names(parameter_values):
    names = []
    for key, value in parameter_values.items():
        if isinstance(value, dict):
            for inner_key in value.keys():
                names.append("{}.{}".format(key, inner_key))
        else:
            names.append(key)

    return names


def _is_number(string):
    if isinstance(string, Number):
        return True
    else:
        float(string)
        return True


def _is_regex_pattern(value, regex):
    try:
        if re.compile(regex).fullmatch(value):
            return True
        else:
            return False
    except re.error:
        return False


def _is_date(string):
    parse(string)
    return True


def _is_date_range(obj):
    return _is_date(obj["start"]) and _is_date(obj["end"])


def _is_value_within_options(value, dropdown_options, allow_list=False):
    if isinstance(value, list):
        return allow_list and set(map(str, value)).issubset(set(dropdown_options))
    return str(value) in dropdown_options


class ParameterizedQuery:
    def __init__(self, template, schema=None, org=None):
        self.schema = schema or []
        self.org = org
        self.template = template
        self.query = template
        self.parameters = {}

    def apply(self, parameters):
        parameters = self._resolve_dynamic_values(parameters)
        invalid_parameter_names = [key for (key, value) in parameters.items() if not self._valid(key, value)]
        if invalid_parameter_names:
            raise InvalidParameterError(invalid_parameter_names)
        else:
            self.parameters.update(parameters)
            self.query = mustache_render(self.template, join_parameter_list_values(parameters, self.schema))

        return self

    def _resolve_dynamic_values(self, parameters):
        if not self.schema:
            return parameters

        types = {definition["name"]: definition.get("type") for definition in self.schema}
        now = utcnow()

        return {name: resolve_dynamic_value(value, types.get(name), now) for name, value in parameters.items()}

    def _valid(self, name, value):
        if not self.schema:
            return True

        definition = next(
            (definition for definition in self.schema if definition["name"] == name),
            None,
        )

        if not definition:
            return False

        enum_options = definition.get("enumOptions")
        query_id = definition.get("queryId")
        regex = definition.get("regex")
        allow_multiple_values = isinstance(definition.get("multiValuesOptions"), dict)

        if isinstance(enum_options, str):
            enum_options = enum_options.split("\n")

        validators = {
            "text": lambda value: isinstance(value, str),
            "text-pattern": lambda value: _is_regex_pattern(value, regex),
            "number": _is_number,
            "enum": lambda value: _is_value_within_options(value, enum_options, allow_multiple_values),
            "query": lambda value: _is_value_within_options(
                value,
                [v["value"] for v in dropdown_values(query_id, self.org)],
                allow_multiple_values,
            ),
            "date": _is_date,
            "datetime-local": _is_date,
            "datetime-with-seconds": _is_date,
            "date-range": _is_date_range,
            "datetime-range": _is_date_range,
            "datetime-range-with-seconds": _is_date_range,
        }

        validate = validators.get(definition["type"], lambda x: False)

        try:
            # multiple error types can be raised here; but we want to convert
            # all except QueryDetached to InvalidParameterError in `apply`
            return validate(value)
        except QueryDetachedFromDataSourceError:
            raise
        except Exception:
            return False

    @property
    def is_safe(self):
        # Free-text parameter types are substituted into the query verbatim.
        if any(param["type"] in ("text", "text-pattern") for param in self.schema):
            return False

        # Placeholders that are not declared in the schema cannot be validated, so
        # any value would be substituted verbatim as well.
        declared = {param["name"] for param in self.schema}
        for param in self.schema:
            if param["type"] in ("date-range", "datetime-range", "datetime-range-with-seconds"):
                # Range values are validated as a single object but rendered via
                # these two fields. Other nested fields are not validated.
                declared.update("{}.{}".format(param["name"], field) for field in ("start", "end"))
        undeclared = set(_collect_query_parameters(self.template)) - declared
        return not undeclared

    @property
    def missing_params(self):
        query_parameters = set(_collect_query_parameters(self.template))
        return set(query_parameters) - set(_parameter_names(self.parameters))

    @property
    def text(self):
        return self.query


class InvalidParameterError(Exception):
    def __init__(self, parameters):
        parameter_names = ", ".join(parameters)
        message = "The following parameter values are incompatible with their definitions: {}".format(parameter_names)
        super(InvalidParameterError, self).__init__(message)


class QueryDetachedFromDataSourceError(Exception):
    def __init__(self, query_id):
        self.query_id = query_id
        super(QueryDetachedFromDataSourceError, self).__init__(
            "This query is detached from any data source. Please select a different query."
        )
