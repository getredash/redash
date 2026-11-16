import unicodedata
from urllib.parse import quote

import regex
from flask import make_response, request
from flask_login import current_user
from flask_restful import abort

from redash import models, rq_redis_connection, settings
from redash.handlers.base import BaseResource, get_object_or_404, record_event
from redash.models.parameterized_query import (
    InvalidParameterError,
    ParameterizedQuery,
    QueryDetachedFromDataSourceError,
    dropdown_values,
)
from redash.permissions import (
    has_access,
    not_view_only,
    require_access,
    require_any_of_permission,
    require_permission,
    view_only,
)
from redash.query_runner.query_results import (
    extract_cached_query_ids,
    extract_query_ids,
    extract_query_params,
)
from redash.serializers import (
    serialize_job,
    serialize_query_result,
    serialize_query_result_to_dsv,
    serialize_query_result_to_xlsx,
)
from redash.tasks import Job
from redash.tasks.queries import enqueue_query
from redash.utils import (
    collect_parameters_from_request,
    gen_query_hash,
    json_dumps,
    json_loads,
    to_filename,
)


def error_response(message, http_status=400):
    return {"job": {"status": 4, "error": message}}, http_status


error_messages = {
    "unsafe_when_shared": error_response(
        "This query contains potentially unsafe parameters and cannot be executed on a shared dashboard or an embedded visualization.",
        403,
    ),
    "unsafe_on_view_only": error_response(
        "This query contains potentially unsafe parameters and cannot be executed with read-only access to this data source.",
        403,
    ),
    "no_permission": error_response("You do not have permission to run queries with this data source.", 403),
    "select_data_source": error_response("Please select data source to run this query.", 401),
    "no_data_source": error_response("Target data source not available.", 401),
}


def get_page(args):
    """
    The (offset, limit) page of rows a request asks for. Responses never carry more than
    QUERY_RESULTS_MAX_PAGE_ROWS rows, which is also the page size when none is asked for.
    """
    offset = args.get("offset")
    limit = args.get("limit")
    try:
        offset = 0 if offset is None else int(offset)
        limit = settings.QUERY_RESULTS_MAX_PAGE_ROWS if limit is None else int(limit)
    except (TypeError, ValueError):
        abort(400, message="offset and limit must be integers.")

    if offset < 0 or limit < 0:
        abort(400, message="offset and limit must not be negative.")

    return offset, min(limit, settings.QUERY_RESULTS_MAX_PAGE_ROWS)


def run_query(query, parameters, data_source, query_id, should_apply_auto_limit, max_age=0, page=None):
    if not data_source:
        return error_messages["no_data_source"]

    if data_source.paused:
        if data_source.pause_reason:
            message = "{} is paused ({}). Please try later.".format(data_source.name, data_source.pause_reason)
        else:
            message = "{} is paused. Please try later.".format(data_source.name)

        return error_response(message)

    try:
        query.apply(parameters)
    except (InvalidParameterError, QueryDetachedFromDataSourceError) as e:
        abort(400, message=str(e))

    query_text = data_source.query_runner.apply_auto_limit(query.text, should_apply_auto_limit)

    if query.missing_params:
        return error_response("Missing parameter value for: {}".format(", ".join(query.missing_params)))

    if max_age == 0:
        query_result = None
    else:
        query_result = models.QueryResult.get_latest(data_source, query_text, max_age)

    record_event(
        current_user.org,
        current_user,
        {
            "action": "execute_query",
            "cache": "hit" if query_result else "miss",
            "object_id": data_source.id,
            "object_type": "data_source",
            "query": query_text,
            "query_id": query_id,
            "parameters": parameters,
        },
    )

    if query_result:
        offset, limit = page or (0, settings.QUERY_RESULTS_MAX_PAGE_ROWS)
        return {"query_result": serialize_query_result(query_result, current_user.is_api_user(), offset, limit)}
    else:
        # SQL annotations must use numeric IDs or server-generated API labels, never user generated content.
        job = enqueue_query(
            query_text,
            data_source,
            current_user.id,
            current_user.is_api_user(),
            metadata={
                "user_id": current_user.get_actual_user() if current_user.is_api_user() else current_user.id,
                "query_id": query_id,
            },
        )
        return serialize_job(job)


def get_download_filename(query_result, query, filetype):
    retrieved_at = query_result.retrieved_at.strftime("%Y_%m_%d")
    if query:
        query_name = regex.sub(r"\p{C}", "", query.name)
        filename = to_filename(query_name) if query_name != "" else str(query.id)
    else:
        filename = str(query_result.id)
    return "{}_{}.{}".format(filename, retrieved_at, filetype)


def content_disposition_filenames(attachment_filename):
    if not isinstance(attachment_filename, str):
        attachment_filename = attachment_filename.decode("utf-8")

    if attachment_filename.isascii():
        filenames = {"filename": attachment_filename}
    else:
        filenames = {
            "filename": unicodedata.normalize("NFKD", attachment_filename).encode("ascii", "ignore").decode("ascii"),
            "filename*": "UTF-8''%s" % quote(attachment_filename, safe=""),
        }

    return filenames


def load_readable_query_result(user, org, query_id, query_result_id):
    """Look up a result by its ID or its query's latest result, aborting unless `user` may read it."""
    query_result = None
    query = None

    if query_result_id:
        query_result = get_object_or_404(models.QueryResult.get_by_id_and_org, query_result_id, org)

    if query_id is not None:
        query = get_object_or_404(models.Query.get_by_id_and_org, query_id, org)

        if query_result is None and query is not None and query.latest_query_data_id is not None:
            query_result = get_object_or_404(
                models.QueryResult.get_by_id_and_org,
                query.latest_query_data_id,
                org,
            )

        if query is not None and query_result is not None and user.is_api_user():
            if query.query_hash != query_result.query_hash:
                abort(404, message="No cached result found for this query.")

    if query_result:
        require_access(query_result.data_source, user, view_only)

        # If the result was produced via the Query Results data source,
        # verify access to each underlying data source referenced in the query.
        if query_result.data_source and query_result.data_source.type == "results":
            query_ids = set(
                extract_query_ids(query_result.query_text)
                + extract_cached_query_ids(query_result.query_text)
                + [int(p[0]) for p in extract_query_params(query_result.query_text)]
            )
            for qid in query_ids:
                try:
                    source_query = models.Query.get_by_id(qid)
                    if source_query.data_source:
                        require_access(source_query.data_source, user, view_only)
                except models.NoResultFound:
                    abort(403, message="Access denied - referenced query no longer exists.")

    return query_result, query


def load_shared_query_result(user, org, query_id, query_result_id, parameters):
    """
    API keys (shared dashboards, embeds) may read a result only when running their query with
    `parameters` produces it, which is what lets them fetch it from QueryResultResource.post.
    """
    query = get_object_or_404(models.Query.get_by_id_and_org, query_id, org)
    query_result = get_object_or_404(models.QueryResult.get_by_id_and_org, query_result_id, org)

    if not query.parameterized.is_safe or not has_access(query, user, view_only):
        abort(403)

    if query.data_source is None or query_result.data_source_id != query.data_source_id:
        abort(404, message="No cached result found for this query.")

    try:
        query_text = query.parameterized.apply(parameters).text
    except InvalidParameterError as e:
        abort(400, message=str(e))

    query_runner = query.data_source.query_runner
    query_hashes = {gen_query_hash(query_runner.apply_auto_limit(query_text, limit)) for limit in (False, True)}
    if query_result.query_hash not in query_hashes:
        abort(404, message="No cached result found for this query.")

    return query_result


class QueryResultListResource(BaseResource):
    @require_permission("execute_query")
    def post(self):
        """
        Execute a query (or retrieve recent results).

        :qparam string query: The query text to execute
        :qparam number query_id: The query object to update with the result (optional)
        :qparam number max_age: If query results less than `max_age` seconds old are available,
                                return them, otherwise execute the query; if omitted or -1, returns
                                any cached result, or executes if not available. Set to zero to
                                always execute.
        :qparam number data_source_id: ID of data source to query
        :qparam object parameters: A set of parameter values to apply to the query.
        :qparam number offset: Index of the first row to return with a cached result. Defaults to 0.
        :qparam number limit: Number of rows to return with a cached result, at most
                              `REDASH_QUERY_RESULTS_MAX_PAGE_ROWS` (its default). `row_count` has the total.
        """
        params = request.get_json(force=True)
        page = get_page(params)

        query = params["query"]
        max_age = params.get("max_age", -1)
        # max_age might have the value of None, in which case calling int(None) will fail
        if max_age is None:
            max_age = -1
        max_age = int(max_age)
        query_id = params.get("query_id", "adhoc")
        parameters = params.get("parameters", collect_parameters_from_request(request.args))

        parameterized_query = ParameterizedQuery(query, org=self.current_org)
        should_apply_auto_limit = params.get("apply_auto_limit", False)

        data_source_id = params.get("data_source_id")
        if data_source_id:
            data_source = models.DataSource.get_by_id_and_org(params.get("data_source_id"), self.current_org)
        else:
            return error_messages["select_data_source"]

        if not has_access(data_source, self.current_user, not_view_only):
            return error_messages["no_permission"]

        return run_query(
            parameterized_query,
            parameters,
            data_source,
            query_id,
            should_apply_auto_limit,
            max_age,
            page,
        )


ONE_YEAR = 60 * 60 * 24 * 365.25


class QueryResultDropdownResource(BaseResource):
    def get(self, query_id):
        query = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)
        require_access(query.data_source, current_user, view_only)
        try:
            return dropdown_values(query_id, self.current_org)
        except QueryDetachedFromDataSourceError as e:
            abort(400, message=str(e))


class QueryDropdownsResource(BaseResource):
    def get(self, query_id, dropdown_query_id):
        query = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)
        require_access(query, current_user, view_only)

        related_queries_ids = [p["queryId"] for p in query.parameters if p["type"] == "query"]
        if int(dropdown_query_id) not in related_queries_ids:
            # Only regular users may preview dropdowns before adding them to the query.
            if current_user.is_api_user():
                abort(403)
            dropdown_query = get_object_or_404(models.Query.get_by_id_and_org, dropdown_query_id, self.current_org)
            require_access(dropdown_query.data_source, current_user, view_only)

        return dropdown_values(dropdown_query_id, self.current_org)


class QueryResultResource(BaseResource):
    @staticmethod
    def add_cors_headers(headers):
        if "Origin" in request.headers:
            origin = request.headers["Origin"]

            if set(["*", origin]) & settings.ACCESS_CONTROL_ALLOW_ORIGIN:
                headers["Access-Control-Allow-Origin"] = origin
                headers["Access-Control-Allow-Credentials"] = str(settings.ACCESS_CONTROL_ALLOW_CREDENTIALS).lower()

    @require_any_of_permission(("view_query", "execute_query"))
    def options(self, query_id=None, query_result_id=None, filetype="json"):
        headers = {}
        self.add_cors_headers(headers)

        if settings.ACCESS_CONTROL_REQUEST_METHOD:
            headers["Access-Control-Request-Method"] = settings.ACCESS_CONTROL_REQUEST_METHOD

        if settings.ACCESS_CONTROL_ALLOW_HEADERS:
            headers["Access-Control-Allow-Headers"] = settings.ACCESS_CONTROL_ALLOW_HEADERS

        return make_response("", 200, headers)

    @require_any_of_permission(("view_query", "execute_query"))
    def post(self, query_id):
        """
        Execute a saved query.

        :param number query_id: The ID of the query whose results should be fetched.
        :param object parameters: The parameter values to apply to the query.
        :qparam number max_age: If query results less than `max_age` seconds old are available,
                                return them, otherwise execute the query; if omitted or -1, returns
                                any cached result, or executes if not available. Set to zero to
                                always execute.
        :param number offset: Index of the first row to return with a cached result. Defaults to 0.
        :param number limit: Number of rows to return with a cached result, at most
                              `REDASH_QUERY_RESULTS_MAX_PAGE_ROWS` (its default). `row_count` has the total.
        """
        params = request.get_json(force=True, silent=True) or {}
        page = get_page(params)
        parameter_values = params.get("parameters", {})

        max_age = params.get("max_age", -1)
        # max_age might have the value of None, in which case calling int(None) will fail
        if max_age is None:
            max_age = -1
        max_age = int(max_age)

        query = get_object_or_404(models.Query.get_by_id_and_org, query_id, self.current_org)

        allow_executing_with_view_only_permissions = query.parameterized.is_safe
        if "apply_auto_limit" in params:
            should_apply_auto_limit = params.get("apply_auto_limit", False)
        else:
            should_apply_auto_limit = query.options.get("apply_auto_limit", False)

        if has_access(query, self.current_user, allow_executing_with_view_only_permissions):
            return run_query(
                query.parameterized,
                parameter_values,
                query.data_source,
                query_id,
                should_apply_auto_limit,
                max_age,
                page,
            )
        else:
            if not query.parameterized.is_safe:
                if current_user.is_api_user():
                    return error_messages["unsafe_when_shared"]
                else:
                    return error_messages["unsafe_on_view_only"]
            else:
                return error_messages["no_permission"]

    @require_any_of_permission(("view_query", "execute_query"))
    def get(self, query_id=None, query_result_id=None, filetype="json"):
        """
        Retrieve query results.

        :param number query_id: The ID of the query whose results should be fetched
        :param number query_result_id: the ID of the query result to fetch
        :param string filetype: Format to return. One of 'json', 'xlsx', or 'csv'. Defaults to 'json'.
        :qparam number offset: For 'json', index of the first row to return. Defaults to 0.
        :qparam number limit: For 'json', number of rows to return, at most `REDASH_QUERY_RESULTS_MAX_PAGE_ROWS`
                              (its default). CSV and Excel downloads always include every row.

        :<json number id: Query result ID
        :<json string query: Query that produced this result
        :<json string query_hash: Hash code for query text
        :<json object data: Query output, with only the requested page of `rows`
        :<json number row_count: Total number of rows in the result
        :<json number data_source_id: ID of data source that produced this result
        :<json number runtime: Length of execution time in seconds
        :<json string retrieved_at: Query retrieval date/time, in ISO format
        """
        # TODO:
        # This method handles two cases: retrieving result by id & retrieving result by query id.
        # They need to be split, as they have different logic (for example, retrieving by query id
        # should check for query parameters and shouldn't cache the result).
        should_cache = query_result_id is not None

        query_result, query = load_readable_query_result(
            self.current_user, self.current_org, query_id, query_result_id
        )

        if query_result:
            if isinstance(self.current_user, models.ApiUser):
                event = {
                    "user_id": None,
                    "org_id": self.current_org.id,
                    "action": "api_get",
                    "api_key": self.current_user.name,
                    "file_type": filetype,
                    "user_agent": request.user_agent.string,
                    "ip": request.remote_addr,
                }

                if query_id:
                    event["object_type"] = "query"
                    event["object_id"] = query_id
                else:
                    event["object_type"] = "query_result"
                    event["object_id"] = query_result_id

                self.record_event(event)

            response_builders = {
                "json": self.make_json_response,
                "xlsx": self.make_excel_response,
                "csv": self.make_csv_response,
                "tsv": self.make_tsv_response,
            }
            response = response_builders[filetype](query_result)

            if len(settings.ACCESS_CONTROL_ALLOW_ORIGIN) > 0:
                self.add_cors_headers(response.headers)

            if should_cache:
                response.headers.add_header("Cache-Control", "private,max-age=%d" % ONE_YEAR)

            filename = get_download_filename(query_result, query, filetype)

            filenames = content_disposition_filenames(filename)
            response.headers.add("Content-Disposition", "attachment", **filenames)

            return response

        else:
            abort(404, message="No cached result found for this query.")

    @staticmethod
    def make_json_response(query_result):
        offset, limit = get_page(request.args)
        data = json_dumps({"query_result": query_result.to_dict(offset, limit)})
        headers = {"Content-Type": "application/json"}
        return make_response(data, 200, headers)

    @staticmethod
    def make_csv_response(query_result):
        headers = {"Content-Type": "text/csv; charset=UTF-8"}
        return make_response(serialize_query_result_to_dsv(query_result, ","), 200, headers)

    @staticmethod
    def make_tsv_response(query_result):
        headers = {"Content-Type": "text/tab-separated-values; charset=UTF-8"}
        return make_response(serialize_query_result_to_dsv(query_result, "\t"), 200, headers)

    @staticmethod
    def make_excel_response(query_result):
        headers = {"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
        return make_response(serialize_query_result_to_xlsx(query_result), 200, headers)


def get_json_arg(name, default):
    """A query string argument holding a JSON object."""
    try:
        value = json_loads(request.args.get(name, json_dumps(default)))
    except ValueError:
        value = None
    if not isinstance(value, dict):
        abort(400, message="{} must be a JSON object.".format(name))
    return value


def get_filters_arg():
    """The `filters` argument: each filter column's selected values."""
    filters = get_json_arg("filters", {})
    if not all(isinstance(values, list) for values in filters.values()):
        abort(400, message="Each filter must be a list of values.")
    return filters


class QueryResultPartResource(BaseResource):
    """Base for resources serving part of a result, which API keys reach through its query."""

    def load_query_result(self, query_result_id, query_id):
        if query_id is not None and self.current_user.is_api_user():
            parameters = get_json_arg("parameters", {})
            return load_shared_query_result(self.current_user, self.current_org, query_id, query_result_id, parameters)

        query_result, _ = load_readable_query_result(self.current_user, self.current_org, query_id, query_result_id)
        if query_result is None:
            abort(404, message="No cached result found for this query.")
        return query_result


class QueryResultRowsResource(QueryResultPartResource):
    @require_any_of_permission(("view_query", "execute_query"))
    def get(self, query_result_id, query_id=None):
        """
        Retrieve a page of a query result's rows.

        Only the requested rows are read from the database; with filters, the database does the filtering.

        :param number query_result_id: The ID of the query result
        :qparam number offset: Index of the first row to return. Defaults to 0.
        :qparam number limit: Number of rows to return, at most `REDASH_QUERY_RESULTS_MAX_PAGE_ROWS` (its default).
        :qparam string filters: JSON object mapping filter columns to the values to keep rows with.
        :qparam string parameters: JSON object of the parameter values the result was produced with.
                                   Required for API keys reading a parameterized query's result.

        :<json array rows: The requested rows
        :<json number offset: Index of the first returned row
        :<json number row_count: Total number of rows in the result, or that pass the filters
        """
        offset, limit = get_page(request.args)
        filters = get_filters_arg()
        query_result = self.load_query_result(query_result_id, query_id)

        if filters:
            rows, row_count = query_result.get_filtered_rows(filters, offset, limit)
        else:
            rows, row_count = query_result.get_rows(offset, limit), query_result.row_count

        headers = {"Cache-Control": "private,max-age=%d" % ONE_YEAR}
        return {"rows": rows, "offset": offset, "row_count": row_count}, 200, headers


class QueryResultChartResource(QueryResultPartResource):
    @require_any_of_permission(("view_query", "execute_query"))
    def get(self, query_result_id, query_id=None):
        """
        Retrieve the marks a chart draws from a query result.

        The marks are built in the database: the rows themselves are neither loaded nor sent. Each mark is
        row-like, and the chart visualization turns the marks into the series it would build from every row.

        :param number query_result_id: The ID of the query result
        :qparam string options: JSON object of the chart's `columnMapping`, `globalSeriesType`,
                                `seriesOptions` (each series' `type`) and `showpoints` options.
        :qparam string filters: JSON object mapping filter columns to the values to keep rows with.
        :qparam number width: The chart's width in pixels, at most; denser series are thinned to it.
        :qparam number height: The chart's height in pixels, at most.
        :qparam string parameters: JSON object of the parameter values the result was produced with.
                                   Required for API keys reading a parameterized query's result.

        :<json array marks: The marks, in the order the chart reads them
        :<json number row_count: Total number of rows in the result
        """
        options = get_json_arg("options", {})
        filters = get_filters_arg()
        try:
            width = min(max(int(request.args.get("width", 1000)), 1), 10000)
            height = min(max(int(request.args.get("height", 1000)), 1), 10000)
        except ValueError:
            abort(400, message="width and height must be integers.")

        query_result = self.load_query_result(query_result_id, query_id)
        try:
            marks = query_result.get_chart_marks(options, filters, width, height)
        except ValueError as e:
            abort(400, message=str(e))

        headers = {"Cache-Control": "private,max-age=%d" % ONE_YEAR}
        return {"marks": marks, "row_count": query_result.row_count}, 200, headers


class JobResource(BaseResource):
    def get(self, job_id, query_id=None):
        """
        Retrieve info about a running query job.
        """
        job = Job.fetch(job_id, connection=rq_redis_connection)
        return serialize_job(job)

    def delete(self, job_id):
        """
        Cancel a query job in progress.
        """
        job = Job.fetch(job_id, connection=rq_redis_connection)
        job.cancel()
