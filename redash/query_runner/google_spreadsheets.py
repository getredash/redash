from base64 import b64decode
import json
import logging
from dateutil import parser
from redash.query_runner import *
from redash.utils import JSONEncoder

logger = logging.getLogger(__name__)

try:
    import gspread
    from oauth2client.client import SignedJwtAssertionCredentials
    enabled = True
except ImportError:
    enabled = False


def _load_key(filename):
    with open(filename, "rb") as f:
        return json.loads(f.read())


def _guess_type(value):
    if value == '':
        return TYPE_STRING
    try:
        val = int(value)
        return TYPE_INTEGER
    except ValueError:
        pass
    try:
        val = float(value)
        return TYPE_FLOAT
    except ValueError:
        pass
    if unicode(value).lower() in ('true', 'false'):
        return TYPE_BOOLEAN
    try:
        val = parser.parse(value)
        return TYPE_DATETIME
    except ValueError:
        pass
    return TYPE_STRING


def _value_eval_list(value):
    value_list = []
    for member in value:
        if member == '' or member is None:
            val = None
            value_list.append(val)
            continue
        try:
            val = int(member)
            value_list.append(val)
            continue
        except ValueError:
            pass
        try:
            val = float(member)
            value_list.append(val)
            continue
        except ValueError:
            pass
        if unicode(member).lower() in ('true', 'false'):
            if unicode(member).lower() == 'true':
                value_list.append(True)
            else:
                value_list.append(False)
            continue
        try:
            val = parser.parse(member)
            value_list.append(val)
            continue
        except ValueError:
            pass
        value_list.append(member)
    return value_list


HEADER_INDEX = 0


class WorksheetNotFoundError(Exception):
    def __init__(self, worksheet_num, worksheet_count):
        message = "Worksheet number {} not found. Spreadsheet has {} worksheets. Note that the worksheet count is zero based.".format(worksheet_num, worksheet_count)
        super(WorksheetNotFoundError, self).__init__(message)


def parse_worksheet(worksheet):
    if not worksheet:
        return {'columns': [], 'rows': []}

    column_names = []
    columns = []
    duplicate_counter = 1

    for j, column_name in enumerate(worksheet[HEADER_INDEX]):
        if column_name in column_names:
            column_name = u"{}{}".format(column_name, duplicate_counter)
            duplicate_counter += 1

        column_names.append(column_name)
        columns.append({
            'name': column_name,
            'friendly_name': column_name,
            'type': TYPE_STRING
        })

    if len(worksheet) > 1:
        for j, value in enumerate(worksheet[HEADER_INDEX+1]):
            columns[j]['type'] = _guess_type(value)

    rows = [dict(zip(column_names, _value_eval_list(row))) for row in worksheet[HEADER_INDEX + 1:]]
    data = {'columns': columns, 'rows': rows}

    return data


def parse_spreadsheet(spreadsheet, worksheet_num):
    worksheets = spreadsheet.worksheets()
    worksheet_count = len(worksheets)
    if worksheet_num >= worksheet_count:
        raise WorksheetNotFoundError(worksheet_num, worksheet_count)

    worksheet = worksheets[worksheet_num].get_all_values()

    return parse_worksheet(worksheet)


class GoogleSpreadsheet(BaseQueryRunner):
    @classmethod
    def annotate_query(cls):
        return False

    @classmethod
    def type(cls):
        return "google_spreadsheets"

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'jsonKeyFile': {
                    "type": "string",
                    'title': 'JSON Key File'
                }
            },
            'required': ['jsonKeyFile'],
            'secret': ['jsonKeyFile']
        }

    def __init__(self, configuration):
        super(GoogleSpreadsheet, self).__init__(configuration)

    def _get_spreadsheet_service(self):
        scope = [
            'https://spreadsheets.google.com/feeds',
        ]

        key = json.loads(b64decode(self.configuration['jsonKeyFile']))
        credentials = SignedJwtAssertionCredentials(key['client_email'], key["private_key"], scope=scope)
        spreadsheetservice = gspread.authorize(credentials)
        return spreadsheetservice

    def test_connection(self):
        self._get_spreadsheet_service()

    def run_query(self, query, user):
        logger.debug("Spreadsheet is about to execute query: %s", query)
        values = query.split("|")
        key = values[0] #key of the spreadsheet
        worksheet_num = 0 if len(values) != 2 else int(values[1])# if spreadsheet contains more than one worksheet - this is the number of it
        try:
            spreadsheet_service = self._get_spreadsheet_service()
            spreadsheet = spreadsheet_service.open_by_key(key)

            data = parse_spreadsheet(spreadsheet, worksheet_num)

            json_data = json.dumps(data, cls=JSONEncoder)
            error = None
        except gspread.SpreadsheetNotFound:
            error = "Spreadsheet ({}) not found. Make sure you used correct id.".format(key)
            json_data = None

        return json_data, error

register(GoogleSpreadsheet)
