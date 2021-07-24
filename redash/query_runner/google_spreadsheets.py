import logging
from base64 import b64decode

from dateutil import parser
from requests import Session
from xlsxwriter.utility import xl_col_to_name

from redash.query_runner import *
from redash.utils import json_dumps, json_loads

logger = logging.getLogger(__name__)

try:
    import gspread
    from gspread.exceptions import APIError
    from oauth2client.service_account import ServiceAccountCredentials

    enabled = True
except ImportError:
    enabled = False


def _load_key(filename):
    with open(filename, "rb") as f:
        return json_loads(f.read())


def _get_columns_and_column_names(row):
    column_names = []
    columns = []
    duplicate_counter = 1

    for i, column_name in enumerate(row):
        if not column_name:
            column_name = "column_{}".format(xl_col_to_name(i))

        if column_name in column_names:
            column_name = "{}{}".format(column_name, duplicate_counter)
            duplicate_counter += 1

        column_names.append(column_name)
        columns.append(
            {"name": column_name, "friendly_name": column_name, "type": TYPE_STRING}
        )

    return columns, column_names


def _value_eval_list(row_values, col_types):
    value_list = []
    raw_values = zip(col_types, row_values)
    for typ, rval in raw_values:
        try:
            if rval is None or rval == "":
                val = None
            elif typ == TYPE_BOOLEAN:
                val = True if str(rval).lower() == "true" else False
            elif typ == TYPE_DATETIME:
                val = parser.parse(rval)
            elif typ == TYPE_FLOAT:
                val = float(rval)
            elif typ == TYPE_INTEGER:
                val = int(rval)
            else:
                # for TYPE_STRING and default
                val = str(rval)
            value_list.append(val)
        except (ValueError, OverflowError):
            value_list.append(rval)
    return value_list


HEADER_INDEX = 0


class WorksheetNotFoundError(Exception):
    def __init__(self, worksheet_num, worksheet_count):
        message = "Worksheet number {} not found. Spreadsheet has {} worksheets. Note that the worksheet count is zero based.".format(
            worksheet_num, worksheet_count
        )
        super(WorksheetNotFoundError, self).__init__(message)


def parse_query(query):
    values = query.split("|")
    key = values[0]  # key of the spreadsheet
    worksheet_num = (
        0 if len(values) != 2 else int(values[1])
    )  # if spreadsheet contains more than one worksheet - this is the number of it

    return key, worksheet_num


def parse_worksheet(worksheet):
    if not worksheet:
        return {"columns": [], "rows": []}

    columns, column_names = _get_columns_and_column_names(worksheet[HEADER_INDEX])

    if len(worksheet) > 1:
        for j, value in enumerate(worksheet[HEADER_INDEX + 1]):
            columns[j]["type"] = guess_type(value)

    column_types = [c["type"] for c in columns]
    rows = [
        dict(zip(column_names, _value_eval_list(row, column_types)))
        for row in worksheet[HEADER_INDEX + 1 :]
    ]
    data = {"columns": columns, "rows": rows}

    return data


def parse_spreadsheet(spreadsheet, worksheet_num):
    worksheets = spreadsheet.worksheets()
    worksheet_count = len(worksheets)
    if worksheet_num >= worksheet_count:
        raise WorksheetNotFoundError(worksheet_num, worksheet_count)

    worksheet = worksheets[worksheet_num].get_all_values()

    return parse_worksheet(worksheet)


def is_url_key(key):
    return key.startswith("https://")


def parse_api_error(error):
    error_data = error.response.json()

    if "error" in error_data and "message" in error_data["error"]:
        message = error_data["error"]["message"]
    else:
        message = str(error)

    return message


class TimeoutSession(Session):
    def request(self, *args, **kwargs):
        kwargs.setdefault("timeout", 300)
        return super(TimeoutSession, self).request(*args, **kwargs)


class GoogleSpreadsheet(BaseQueryRunner):
    should_annotate_query = False

    def __init__(self, configuration):
        super(GoogleSpreadsheet, self).__init__(configuration)
        self.syntax = "custom"

    @classmethod
    def name(cls):
        return "Google Sheets"

    @classmethod
    def type(cls):
        return "google_spreadsheets"

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {"jsonKeyFile": {"type": "string", "title": "JSON Key File"}},
            "required": ["jsonKeyFile"],
            "secret": ["jsonKeyFile"],
        }

    def _get_spreadsheet_service(self):
        scope = ["https://spreadsheets.google.com/feeds"]

        key = json_loads(b64decode(self.configuration["jsonKeyFile"]))
        creds = ServiceAccountCredentials.from_json_keyfile_dict(key, scope)

        timeout_session = Session()
        timeout_session.requests_session = TimeoutSession()
        spreadsheetservice = gspread.Client(auth=creds, session=timeout_session)
        spreadsheetservice.login()
        return spreadsheetservice

    def test_connection(self):
        service = self._get_spreadsheet_service()
        test_spreadsheet_key = "1S0mld7LMbUad8LYlo13Os9f7eNjw57MqVC0YiCd1Jis"
        try:
            service.open_by_key(test_spreadsheet_key).worksheets()
        except APIError as e:
            message = parse_api_error(e)
            raise Exception(message)

    def run_query(self, query, user):
        logger.debug("Spreadsheet is about to execute query: %s", query)
        key, worksheet_num = parse_query(query)

        try:
            spreadsheet_service = self._get_spreadsheet_service()

            if is_url_key(key):
                spreadsheet = spreadsheet_service.open_by_url(key)
            else:
                spreadsheet = spreadsheet_service.open_by_key(key)

            data = parse_spreadsheet(spreadsheet, worksheet_num)

            return json_dumps(data), None
        except gspread.SpreadsheetNotFound:
            return (
                None,
                "Spreadsheet ({}) not found. Make sure you used correct id.".format(
                    key
                ),
            )
        except APIError as e:
            return None, parse_api_error(e)


register(GoogleSpreadsheet)
