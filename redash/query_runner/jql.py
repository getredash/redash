import re
from collections import OrderedDict

from redash.query_runner import TYPE_STRING, BaseHTTPQueryRunner, register
from redash.utils import json_loads


# TODO: make this more general and move into __init__.py
class ResultSet:
    def __init__(self):
        self.columns = OrderedDict()
        self.rows = []

    def add_row(self, row):
        for key in row.keys():
            self.add_column(key)

        self.rows.append(row)

    def add_column(self, column, column_type=TYPE_STRING):
        if column not in self.columns:
            self.columns[column] = {
                "name": column,
                "type": column_type,
                "friendly_name": column,
            }

    def to_json(self):
        return {"rows": self.rows, "columns": list(self.columns.values())}

    def merge(self, set):
        self.rows = self.rows + set.rows


def parse_issue(issue, field_mapping):  # noqa: C901
    result = OrderedDict()

    # Handle API v3 response format: key field may be missing, use id as fallback
    result["key"] = issue.get("key", issue.get("id", "unknown"))

    # Handle API v3 response format: fields may be missing
    fields = issue.get("fields", {})
    for k, v in fields.items():  #
        output_name = field_mapping.get_output_field_name(k)
        member_names = field_mapping.get_dict_members(k)

        if isinstance(v, dict):
            if len(member_names) > 0:
                # if field mapping with dict member mappings defined get value of each member
                for member_name in member_names:
                    if member_name in v:
                        result[field_mapping.get_dict_output_field_name(k, member_name)] = v[member_name]

            else:
                # these special mapping rules are kept for backwards compatibility
                if "key" in v:
                    result["{}_key".format(output_name)] = v["key"]
                if "name" in v:
                    result["{}_name".format(output_name)] = v["name"]

                if k in v:
                    result[output_name] = v[k]

                if "watchCount" in v:
                    result[output_name] = v["watchCount"]

        elif isinstance(v, list):
            if len(member_names) > 0:
                # if field mapping with dict member mappings defined get value of each member
                for member_name in member_names:
                    listValues = []
                    for listItem in v:
                        if isinstance(listItem, dict):
                            if member_name in listItem:
                                listValues.append(listItem[member_name])
                    if len(listValues) > 0:
                        result[field_mapping.get_dict_output_field_name(k, member_name)] = ",".join(listValues)

            else:
                # otherwise support list values only for non-dict items
                listValues = []
                for listItem in v:
                    if not isinstance(listItem, dict):
                        listValues.append(listItem)
                if len(listValues) > 0:
                    result[output_name] = ",".join(listValues)

        else:
            result[output_name] = v

    return result


def parse_issues(data, field_mapping):
    results = ResultSet()

    for issue in data["issues"]:
        results.add_row(parse_issue(issue, field_mapping))

    return results


def parse_count(data):
    results = ResultSet()
    # API v3 may not return 'total' field, fallback to counting issues
    count = data.get("total", len(data.get("issues", [])))
    results.add_row({"count": count})
    return results


class FieldMapping:
    def __init__(cls, query_field_mapping):
        cls.mapping = []
        for k, v in query_field_mapping.items():
            field_name = k
            member_name = None

            # check for member name contained in field name
            member_parser = re.search(r"(\w+)\.(\w+)", k)
            if member_parser:
                field_name = member_parser.group(1)
                member_name = member_parser.group(2)

            cls.mapping.append(
                {
                    "field_name": field_name,
                    "member_name": member_name,
                    "output_field_name": v,
                }
            )

    def get_output_field_name(cls, field_name):
        for item in cls.mapping:
            if item["field_name"] == field_name and not item["member_name"]:
                return item["output_field_name"]
        return field_name

    def get_dict_members(cls, field_name):
        member_names = []
        for item in cls.mapping:
            if item["field_name"] == field_name and item["member_name"]:
                member_names.append(item["member_name"])
        return member_names

    def get_dict_output_field_name(cls, field_name, member_name):
        for item in cls.mapping:
            if item["field_name"] == field_name and item["member_name"] == member_name:
                return item["output_field_name"]
        return None


class JiraJQL(BaseHTTPQueryRunner):
    noop_query = '{"queryType": "count"}'
    response_error = "JIRA returned unexpected status code"
    requires_authentication = True
    url_title = "JIRA URL"
    username_title = "Username"
    password_title = "API Token"

    @classmethod
    def name(cls):
        return "JIRA (JQL)"

    def __init__(self, configuration):
        super(JiraJQL, self).__init__(configuration)
        self.syntax = "json"

    def run_query(self, query, user):
        # Updated to API v3 endpoint, fix double slash issue
        jql_url = "{}/rest/api/3/search/jql".format(self.configuration["url"].rstrip("/"))

        query = json_loads(query)
        query_type = query.pop("queryType", "select")
        field_mapping = FieldMapping(query.pop("fieldMapping", {}))

        # API v3 requires mandatory jql parameter with restrictions
        if "jql" not in query or not query["jql"]:
            query["jql"] = "created >= -30d order by created DESC"

        if query_type == "count":
            query["maxResults"] = 1
            query["fields"] = ""
        else:
            query["maxResults"] = query.get("maxResults", 1000)

        response, error = self.get_response(jql_url, params=query)
        if error is not None:
            return None, error

        data = response.json()

        if query_type == "count":
            results = parse_count(data)
        else:
            results = parse_issues(data, field_mapping)

            # API v3 uses token-based pagination instead of startAt/total
            while not data.get("isLast", True) and "nextPageToken" in data:
                query["nextPageToken"] = data["nextPageToken"]
                response, error = self.get_response(jql_url, params=query)
                if error is not None:
                    return None, error

                data = response.json()
                addl_results = parse_issues(data, field_mapping)
                results.merge(addl_results)

        return results.to_json(), None


register(JiraJQL)
