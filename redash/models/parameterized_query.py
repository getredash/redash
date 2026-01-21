import logging
import re
import time
from functools import partial
from numbers import Number

import pystache
from dateutil.parser import parse
from funcy import distinct
from rq.timeouts import JobTimeoutException

from redash.utils import mustache_render, utcnow

logger = logging.getLogger(__name__)


def _pluck_name_and_value(default_column, row):
    row = {k.lower(): v for k, v in row.items()}
    name_column = "name" if "name" in row.keys() else default_column.lower()
    value_column = "value" if "value" in row.keys() else default_column.lower()

    return {"name": row[name_column], "value": str(row[value_column])}


def _load_result(query_id, org, user, run_if_not_cached, query_stack=None):
    from redash import models

    # Initialize query stack for cycle detection
    if query_stack is None:
        query_stack = set()

    db_role = getattr(user, "db_role", None)

    # Detect cycle
    if query_id in query_stack:
        raise ParameterizedQueryCycleError(query_id, db_role, query_stack)

    query = models.Query.get_by_id_and_org(query_id, org)

    if not query.data_source:
        raise QueryDetachedFromDataSourceError(query_id)

    query_result = models.QueryResult.get_latest(
        data_source=query.data_source,
        query=query.query_hash,
        max_age=-1,
        is_hash=True,
        db_role=db_role,
    )
    if not query_result:
        if not run_if_not_cached:
            raise DropdownSubqueryError(query.id, db_role, "cached results not found")
        logger.info("Dropdown values not found for query id {} and db_role {}, running on-demand query to populate cache".format(query.id, db_role))
        query_text = query.query_text
        if query.options:
            parameters = {p["name"]: p.get("value") for p in query.parameters}
            if any(parameters):
                # query_stack is used to detect cycles in dropdown parameter queries
                query_text = query.parameterized.apply(parameters, user, query_stack | {query_id}).query
            apply_auto_limit = query.options.get("apply_auto_limit", False)
            query_text = query.data_source.query_runner.apply_auto_limit(query_text, apply_auto_limit)
        try:
            started_at = time.time()
            results, error = query.data_source.query_runner.run_query(query_text, user)
            run_time = time.time() - started_at
            logger.info("On-demand query completed in {} seconds".format(run_time))
        except JobTimeoutException:
            raise DropdownSubqueryError(query.id, db_role, "Query exceeded Redash query execution time limit")
        except Exception as e:
            raise DropdownSubqueryError(query.id, db_role, str(e))
        if error:
            raise DropdownSubqueryError(query.id, db_role, error)
        query_result = models.QueryResult.store_result(
            org.id,
            query.data_source,
            query.query_hash,
            query_text,
            results,
            run_time,
            utcnow(),
            db_role,
        )
    return query_result.data


def dropdown_values(query_id, org, user, run_if_not_cached=False, query_stack=None):
    data = _load_result(query_id, org, user, run_if_not_cached, query_stack)
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
        if isinstance(node, pystache.parser._EscapeNode):
            keys.append(node.key)
        elif isinstance(node, pystache.parser._SectionNode):
            keys.append(node.key)
            keys.extend(_collect_key_names(node.parsed))

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

    def apply(self, parameters, user, query_stack=None):
        invalid_parameter_names = [key for (key, value) in parameters.items() if not self._valid(key, value, user, query_stack)]
        if invalid_parameter_names:
            raise InvalidParameterError(invalid_parameter_names)
        else:
            self.parameters.update(parameters)
            self.query = mustache_render(self.template, join_parameter_list_values(parameters, self.schema))

        return self

    def _valid(self, name, value, user, query_stack=None):
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
                [v["value"] for v in dropdown_values(query_id, self.org, user, query_stack=query_stack)],
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
        text_parameters = [param for param in self.schema if param["type"] == "text"]
        return not any(text_parameters)

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

class DropdownSubqueryError(Exception):
    def __init__(self, query_id, db_role, error):
        self.query_id = query_id
        self.db_role = db_role
        self.error = error
        super(DropdownSubqueryError, self).__init__(
            "Error loading dropdown values for query id {} and db_role {}: {}".format(query_id, db_role, error)
        )

class ParameterizedQueryCycleError(DropdownSubqueryError):
    def __init__(self, query_id, db_role, query_stack):
        self.query_id = query_id
        self.query_stack = query_stack
        cycle_path = " -> ".join(str(qid) for qid in query_stack) + " -> " + str(query_id)
        super(ParameterizedQueryCycleError, self).__init__(
            query_id,
            db_role,
            "Circular dependency detected in dropdown parameter queries: {}".format(cycle_path),
        )
